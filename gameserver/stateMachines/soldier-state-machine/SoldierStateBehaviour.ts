import { MOVABLE_UNIT_CONSTANTS } from "../../config";
import SAT from "sat";
import { IStateActions } from "../../core/CustomStateMachine";
import { AllianceTypes } from "../../AllianceTracker";
import { SoldierState } from "../../schema/SoldierState";
import { GameStateManagerType } from "../../schema/PlayerState";

export default {
  Idle: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    if (!soldier.hasReachedDestination()) {
      soldier.stateMachine.controller.send("Move");
      return;
    }

    // if nearby unit getting attacked.
    const centerPos = soldier.getSceneItem().getCircleCenter();
    const nearbyUnits = stateManager.scene.getNearbyUnits(
      centerPos.x,
      centerPos.y,
      MOVABLE_UNIT_CONSTANTS.NEARBY_SEARCH_RADI,
      ["MOVABLE"]
    );
    if (nearbyUnits.length < 2) return;

    const nearbyAllyUnitsAttacked = nearbyUnits.filter((unit) => {
      const sceneItem = stateManager.scene.getSceneItemById<SoldierState>(
        unit.id
      );
      const isSelf = unit.id === soldier.id;
      const isSameTeam = sceneItem.playerId === soldier.playerId;
      return !isSelf && isSameTeam;
    });
    
    for (let i = 0; i < nearbyAllyUnitsAttacked.length; i++) {
      let unit = stateManager.scene.getSceneItemById<SoldierState>(
        nearbyAllyUnitsAttacked[i].id
      );

      const isSelf = unit.id === soldier.id;
      const isDifferentTeam = unit.playerId !== soldier.playerId;
      if (!unit || isSelf || isDifferentTeam) continue;

      const isAllyDefendingOrAttacking = ["Defend", "Attack"].includes(unit.getState());
      if(!isAllyDefendingOrAttacking)
          continue;
      
      //if nearby friendly unit is either defending/attacking, then assist it.
      const enemy = unit.getAttackTarget();
      if (!enemy) continue;

      soldier.setAttackTarget(enemy);
      soldier.stateMachine.controller.send("DefendAllyUnit");
      break;
    }
  },

  Move: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    let stateMachineTrigged = false;

    if (soldier.hasReachedDestination()) {
      soldier.stateMachine.controller.send("ReachedPosition");
      stateMachineTrigged = true;
    }
    soldier.move(delta, stateManager);
    const centerPos = soldier.getSceneItem().getCircleCenter();
    const nearbyUnits = stateManager.scene.getNearbyUnits(
      centerPos.x,
      centerPos.y,
      MOVABLE_UNIT_CONSTANTS.NEARBY_SEARCH_RADI,
      ["MOVABLE"]
    );

    if (nearbyUnits.length < 2) return;

    nearbyUnits.forEach((unit) => {
      if (unit.id === soldier.id) return;

      const nearbySoldierUnit =
      stateManager.scene.getSceneItemById<SoldierState>(unit.id);
      if (!nearbySoldierUnit) return;
      // if nearby unit (of same team) has same destination (approx.)
      let overlapExpectedPos =
        new SAT.Vector()
          .copy(nearbySoldierUnit.getExpectedPosition())
          .sub(soldier.getExpectedPosition())
          .len() <= Math.max(MOVABLE_UNIT_CONSTANTS.MAX_TARGETPOS_OVERLAP_DIST, soldier.radius*2.1);

      let anyOneAtDest =
        nearbySoldierUnit.hasReachedDestination() ||
        soldier.hasReachedDestination();

      if (anyOneAtDest && overlapExpectedPos) {
        nearbySoldierUnit.isAtDestination = soldier.isAtDestination = true;
        soldier.setExpectedPosition(soldier.getSceneItem().pos);
        if (!stateMachineTrigged)
          soldier.stateMachine.controller.send("ReachedPosition");
      }
    });
  },

  Attack: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    let attackTarget = soldier.getAttackTarget();
    if (!attackTarget) {
      soldier.stateMachine.controller.send("TargetLost");
      return;
    }
    let distToTarget = new SAT.Vector()
      .copy(attackTarget.getSceneItem().pos)
      .sub(soldier.getSceneItem().pos)
      .len();
    
    if (distToTarget > MOVABLE_UNIT_CONSTANTS.DISTANCE_DURING_ATTACK) {
      soldier.stateMachine.controller.send("TargetNotInRange");
      return;
    }

    attackTarget.takeDamage(delta, soldier, stateManager);

    //if attacked soldier unit dead, update server-state and schedule update for client.
    if (attackTarget.health === 0) {
      const victimPlayerId = attackTarget.playerId;
      const victimPlayer = stateManager.getPlayer(victimPlayerId);
      if (!victimPlayer) {
        return;
      }
      soldier.setAttackTarget(null);
      victimPlayer.removeSoldier(attackTarget.id, stateManager);
      soldier.stateMachine.controller.send("TargetKilled");
    }
  },

  FindTarget: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    try {
      soldier.setAttackTarget(null);
      const centerPos = soldier.getSceneItem().getCircleCenter();
      const nearbyUnits = stateManager.scene.getNearbyUnits(
        centerPos.x,
        centerPos.y,
        MOVABLE_UNIT_CONSTANTS.NEARBY_SEARCH_RADI,
        ["MOVABLE"]
      );
      if (nearbyUnits.length < 2) {
        throw new Error(
          "[SoldierStateBehaviour | FindTarget]: No Nearby Units Found."
        );
      }

      //Go to unit with least distance instead of random unit.
      let minDist = Number.POSITIVE_INFINITY;
      let nearestUnit: SoldierState | null = null;
      for (const unit of nearbyUnits) {
        let unitSoldier = stateManager.scene.getSceneItemById<SoldierState>(
          unit.id
        );

        const isSelf = unit.id === soldier.id;
        const isAllianceStable =
          stateManager.getAlliance(soldier.playerId, unitSoldier.playerId) !==
          AllianceTypes.ENEMIES;

        if (!unitSoldier || isSelf || isAllianceStable)
          continue;
        
        let distBetweenUnits = new SAT.Vector()
          .copy(unitSoldier.getSceneItem().pos)
          .sub(soldier.getSceneItem().pos)
          .len();

        if (distBetweenUnits < minDist) {
          minDist = distBetweenUnits;
          nearestUnit = unitSoldier;
        }
      }

      if (!nearestUnit)
        throw new Error(
          "[SoldierStateBehaviour | FindTarget]: No Enemy Unit nearby."
        );

      soldier.setAttackTarget(nearestUnit);
      soldier.stateMachine.controller.send("TargetFound");
    } catch (err) {
      soldier.stateMachine.controller.send("TargetNotFound");
    }
  },

  Defend: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    if (!soldier.getAttackTarget()) {
      soldier.stateMachine.controller.send("NoAttackerUnitNearby");
      return;
    }
    soldier.stateMachine.controller.send("AttackerUnitNearby");
  },

  ChaseTarget: ({
    delta,
    stateManager,
    soldier,
  }: {
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }) => {
    const soldierAttackTarget = soldier.getAttackTarget();
    try {
      if (!soldierAttackTarget) {
        soldier.stateMachine.controller.send("TargetLost");
        return;
      }

      const seperationForce = soldier.getSeperationVector(stateManager);
      const steerForce = soldier.getSteerVector(
        soldierAttackTarget.getSceneItem().pos
      );
      soldier.applyForce(seperationForce);
      soldier.applyForce(steerForce);

      soldier.targetPositionX = soldierAttackTarget.getSceneItem().x;
      soldier.targetPositionY = soldierAttackTarget.getSceneItem().y;

      soldier.expectedPositionX = soldierAttackTarget.getSceneItem().x;
      soldier.expectedPositionY = soldierAttackTarget.getSceneItem().y;

      soldier.move(delta, stateManager);
      
      const distToTarget = new SAT.Vector()
        .copy(soldierAttackTarget.getSceneItem().pos)
        .sub(soldier.getSceneItem().pos)
        .len();
      if (distToTarget <= MOVABLE_UNIT_CONSTANTS.DISTANCE_DURING_ATTACK) {
        soldier.stateMachine.controller.send("TargetInRange");
      }
    } catch (err) {
      console.error(err);
      if (soldierAttackTarget) {
        const targetPos = soldierAttackTarget.getSceneItem().getPosition();
        soldier.targetPositionX = targetPos.x;
        soldier.targetPositionY = targetPos.y;

        soldier.expectedPositionX = targetPos.x;
        soldier.expectedPositionY = targetPos.y;
      }
      else soldier.setAttackTarget(null);
    }
  },
} as IStateActions;
