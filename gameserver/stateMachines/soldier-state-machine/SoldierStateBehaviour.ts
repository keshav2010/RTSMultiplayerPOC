import SoldierConstants from "../../unitConstants";
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
    const nearbyUnits = stateManager.scene.getNearbyUnits(
      soldier.getSceneItem().pos.x + soldier.getSceneItem().w / 2,
      soldier.getSceneItem().pos.y + soldier.getSceneItem().h / 2,
      SoldierConstants.NEARBY_SEARCH_RADI
    );
    if (nearbyUnits.length < 2) return;

    // if any nearby friendly unit under attack
    let nearbyAllies = nearbyUnits.filter((unit) => {
      const sceneItem = stateManager.scene.getSceneItemById<SoldierState>(
        unit.id
      );
      return unit.id !== soldier.id && sceneItem?.playerId === soldier.playerId;
    });
    for (let i = 0; i < nearbyAllies.length; i++) {
      let unit = stateManager.scene.getSceneItemById<SoldierState>(
        nearbyAllies[i].id
      );
      if (!unit || unit.id === soldier.id || unit.playerId !== soldier.playerId)
        continue;

      //if nearby friendly unit is either defending/attacking, then assist it.
      if (["Defend", "Attack"].includes(unit.getState())) {
        let enemy = unit.getAttackTarget();
        if (!enemy) continue;
        soldier.setAttackTarget(enemy);
        soldier.stateMachine.controller.send("DefendAllyUnit");
        break;
      }
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

    const nearbyUnits = stateManager.scene.getNearbyUnits(
      soldier.getSceneItem().pos.x + soldier.getSceneItem().w / 2,
      soldier.getSceneItem().pos.y + soldier.getSceneItem().h / 2,
      SoldierConstants.NEARBY_SEARCH_RADI,
      ['MOVABLE']
    );

    if (nearbyUnits.length < 2) return;

    nearbyUnits.forEach((unit) => {
      if (unit.id === soldier.id) return;

      const nearbySoldierUnit = stateManager.scene.getSceneItemById<SoldierState>(unit.id);
      if (!nearbySoldierUnit) return;
      // if nearby unit (of same team) has same destination (approx.)
      let overlapExpectedPos =
        new SAT.Vector()
          .copy(nearbySoldierUnit.getExpectedPosition())
          .sub(soldier.getExpectedPosition())
          .len() <= SoldierConstants.MAX_TARGETPOS_OVERLAP_DIST;

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
    if (distToTarget > SoldierConstants.DESIRED_DIST_FROM_TARGET) {
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
      var nearbyUnits = stateManager.scene.getNearbyUnits(
        soldier.getSceneItem().pos.x + soldier.getSceneItem().w / 2,
        soldier.getSceneItem().pos.y + soldier.getSceneItem().h / 2,
        SoldierConstants.ENEMY_SEARCH_RADIUS,
        ['MOVABLE']
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
        let unitSoldier = stateManager.scene.getSceneItemById<SoldierState>(unit.id);
        if (
          !unitSoldier ||
          unit.id === soldier.id ||
          stateManager.getAlliance(soldier.playerId, unitSoldier.playerId) !==
            AllianceTypes.ENEMIES
        )
          break;

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

      soldier.targetPositionX = soldierAttackTarget.getSceneItem().pos.x;
      soldier.targetPositionY = soldierAttackTarget.getSceneItem().pos.y;

      soldier.expectedPositionX = soldierAttackTarget.getSceneItem().pos.x;
      soldier.expectedPositionY = soldierAttackTarget.getSceneItem().pos.y;

      const distToTarget = new SAT.Vector()
        .copy(soldierAttackTarget.getSceneItem().pos)
        .sub(soldier.getSceneItem().pos)
        .len();
      if (distToTarget <= SoldierConstants.DESIRED_DIST_FROM_TARGET) {
        soldier.stateMachine.controller.send("TargetInRange");
      }
    } catch (err) {
      console.error(err);
      if (soldierAttackTarget) {
        soldier.targetPositionX = soldierAttackTarget.getSceneItem().pos.x;
        soldier.targetPositionY = soldierAttackTarget.getSceneItem().pos.y;

        soldier.expectedPositionX = soldierAttackTarget.getSceneItem().pos.x;
        soldier.expectedPositionY = soldierAttackTarget.getSceneItem().pos.y;
      }
      soldier.setAttackTarget(null);
    }
  },
} as IStateActions;
