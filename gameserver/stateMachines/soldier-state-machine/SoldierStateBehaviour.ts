import SoldierConstants from "../../unitConstants";
import { PacketType } from "../../../common/PacketType";
import SAT from "sat";
const { AllianceTypes } = require("../../lib/AllianceTracker");
import { GameStateManager } from "../../lib/GameStateManager";
import { Soldier } from "../../Soldier";
import { IStateActions } from "../../lib/StateMachine";
export default {
  Idle: ({
    delta,
    updateManager,
    stateManager,
    soldier,
  }: {
    delta: any;
    updateManager: any;
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    /*repel from only those units which are not yet at their destination.
     */
    let steerForce = soldier.getSteerVector(soldier.expectedPosition);
    let seperationForce = soldier.getSeperationVector(
      stateManager,
      (a: Soldier, b: Soldier) => {
        return a.hasReachedDestination() && b.hasReachedDestination();
      }
    );
    soldier.applyForce(steerForce);
    soldier.applyForce(seperationForce);
    if (!soldier.hasReachedDestination()) {
      soldier.stateMachine.controller.send("Move");
      return;
    }

    // if nearby unit getting attacked.
    let nearbyUnits = stateManager.scene.getNearbyUnits(
      {
        x: soldier.pos.x + soldier.width / 2,
        y: soldier.pos.y + soldier.height / 2,
      },
      SoldierConstants.NEARBY_SEARCH_RADI
    );
    if (nearbyUnits.length < 2) return;

    // if any nearby friendly unit under attack
    let nearbyAllies = nearbyUnits.filter(
      (unit: Soldier) => unit !== soldier && unit.playerId === soldier.playerId
    );
    for (let i = 0; i < nearbyAllies.length; i++) {
      let unit = nearbyAllies[i];
      if (unit === soldier || unit.playerId !== soldier.playerId) continue;

      unit = stateManager.getPlayerById(unit.playerId)?.getSoldier(unit.id);
      if (!unit) {
        continue;
      }
      //if nearby friendly unit is either defending/attacking, then assist it.
      if (["Defend", "Attack"].includes(unit.getCurrentState())) {
        let enemy = unit.getAttackTarget(stateManager);
        if (!enemy) continue;
        soldier.setAttackTarget(
          stateManager,
          enemy.player.id,
          enemy.soldier.id
        );
        soldier.stateMachine.controller.send("DefendAllyUnit");
        break;
      }
    }
  },

  Move: ({
    delta,
    updateManager,
    stateManager,
    soldier,
  }: {
    delta: number;
    updateManager: any;
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    let seperationForce = soldier.getSeperationVector(stateManager);
    let steerForce = soldier.getSteerVector(soldier.expectedPosition);
    soldier.applyForce(seperationForce);
    soldier.applyForce(steerForce);

    let stateMachineTrigged = false;
    if (soldier.hasReachedDestination()) {
      soldier.stateMachine.controller.send("ReachedPosition");
      stateMachineTrigged = true;
    }

    var nearbyUnits = stateManager.scene.getNearbyUnits(
      {
        x: soldier.pos.x + soldier.width / 2,
        y: soldier.pos.y + soldier.height / 2,
      },
      SoldierConstants.NEARBY_SEARCH_RADI
    );
    if (nearbyUnits.length < 2) return;

    nearbyUnits.forEach((unit: Soldier) => {
      if (unit === soldier) return;

      // if nearby unit (of same team) has same destination (approx.)
      let overlapExpectedPos =
        new SAT.Vector()
          .copy(unit.expectedPosition)
          .sub(soldier.expectedPosition)
          .len() <= SoldierConstants.MAX_TARGETPOS_OVERLAP_DIST;

      let anyOneAtDest =
        unit.hasReachedDestination() || soldier.hasReachedDestination();

      if (anyOneAtDest && overlapExpectedPos) {
        unit.isAtDestination = soldier.isAtDestination = true;
        soldier.expectedPosition.copy(soldier.pos);
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
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    let attackTarget = soldier.getAttackTarget(stateManager);
    if (!attackTarget) {
      soldier.stateMachine.controller.send("TargetLost");
      return;
    }
    let distToTarget = new SAT.Vector()
      .copy(attackTarget.soldier.pos)
      .sub(soldier.pos)
      .len();
    if (distToTarget > SoldierConstants.DESIRED_DIST_FROM_TARGET) {
      soldier.stateMachine.controller.send("TargetNotInRange");
      return;
    }

    attackTarget.soldier.attackMe(delta, soldier, stateManager);

    //schedule update to client about attack on enemy soldier.
    stateManager.enqueueStateUpdate({
      type: PacketType.ByServer.SOLDIER_ATTACKED,
      a: soldier.getSnapshot(),
      b: attackTarget.soldier.getSnapshot(),
    });

    //if attacked soldier unit dead, update server-state and schedule update for client.
    if (attackTarget.soldier.health === 0) {
      stateManager.enqueueStateUpdate({
        type: PacketType.ByServer.SOLDIER_KILLED,
        playerId: attackTarget.player.id,
        soldierId: attackTarget.soldier.id,
      });
      let isRemoved = stateManager.removeSoldier(
        attackTarget.player.id,
        attackTarget.soldier.id
      );
      if (!isRemoved)
        console.log(
          `Soldier ID#${attackTarget?.soldier.id} is probably already removed.`
        );
      soldier.setAttackTarget(stateManager);
      soldier.stateMachine.controller.send("TargetKilled");
    }
  },

  FindTarget: ({
    delta,
    updateManager,
    stateManager,
    soldier,
  }: {
    delta: number;
    updateManager: any;
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    try {
      soldier.setAttackTarget(stateManager);
      var nearbyUnits = stateManager.scene.getNearbyUnits(
        {
          x: soldier.pos.x + soldier.width / 2,
          y: soldier.pos.y + soldier.height / 2,
        },
        SoldierConstants.ENEMY_SEARCH_RADIUS
      );
      if (nearbyUnits.length < 2) {
        throw new Error(
          "[SoldierStateBehaviour | FindTarget]: No Nearby Units Found."
        );
      }

      //Go to unit with least distance instead of random unit.
      let minDist = Number.POSITIVE_INFINITY;
      let nearestUnit: any = null;
      nearbyUnits.forEach((unit: { playerId: any; pos: any } | undefined) => {
        //consider only if unit belongs to enemy team
        if (
          unit === this ||
          stateManager.getAlliance(soldier.playerId, unit.playerId) !==
            AllianceTypes.ENEMIES
        )
          return;

        let distBetweenUnits = new SAT.Vector()
          .copy(unit.pos)
          .sub(soldier.pos)
          .len();
        if (distBetweenUnits < minDist) {
          minDist = distBetweenUnits;
          unit = nearestUnit;
        }
      });
      if (!nearestUnit)
        throw new Error(
          "[SoldierStateBehaviour | FindTarget]: No Enemy Unit nearby."
        );

      soldier.setAttackTarget(
        stateManager,
        nearestUnit.playerId,
        nearestUnit.id
      );
      soldier.stateMachine.controller.send("TargetFound");
    } catch (err) {
      soldier.stateMachine.controller.send("TargetNotFound");
    }
  },

  Defend: ({
    delta,
    updateManager,
    stateManager,
    soldier,
  }: {
    delta: number;
    updateManager: any;
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    if (!soldier.getAttackTarget(stateManager)) {
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
    stateManager: GameStateManager;
    soldier: Soldier;
  }) => {
    const soldierAttackTarget = soldier.getAttackTarget(stateManager);
    try {
      if (!soldierAttackTarget) {
        soldier.stateMachine.controller.send("TargetLost");
        return;
      }

      let seperationForce = soldier.getSeperationVector(stateManager);
      let steerForce = soldier.getSteerVector(soldierAttackTarget.soldier.pos);
      soldier.applyForce(seperationForce);
      soldier.applyForce(steerForce);

      soldier.targetPosition.copy(soldierAttackTarget.soldier.pos);
      soldier.expectedPosition.copy(soldierAttackTarget.soldier.pos);

      stateManager.enqueueStateUpdate({
        type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
        soldier: soldier.getSnapshot(),
      });

      let distToTarget = new SAT.Vector()
        .copy(soldierAttackTarget.soldier.pos)
        .sub(soldier.pos)
        .len();
      if (distToTarget <= SoldierConstants.DESIRED_DIST_FROM_TARGET) {
        soldier.stateMachine.controller.send("TargetInRange");
      }
    } catch (err) {
      console.log(err);
      if (soldierAttackTarget) {
        soldier.targetPosition.copy(soldierAttackTarget.soldier.pos);
        soldier.expectedPosition.copy(soldier.targetPosition);
      }
      soldier.setAttackTarget(stateManager);
    }
  },
} as IStateActions;
