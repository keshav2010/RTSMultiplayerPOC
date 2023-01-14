const SoldierConstants = require("../../unitConstants");
const SAT = require("sat");
const PacketType = require("../../../common/PacketType");
module.exports = {
  Idle: ({ delta, updateManager, stateManager, soldier }) => {
    /*repel from only those units which are not yet at their destination.
     */
    let seperationForce = soldier.getSeperationVector(stateManager, (a, b) => {
      return a.hasReachedDestination() && b.hasReachedDestination();
    });

    soldier.applyForce(seperationForce);
    if (soldier.velocityVector.len() > 0 || !soldier.hasReachedDestination()) {
      soldier.stateMachine.controller.send("Move");
    }
  },

  Move: ({ delta, updateManager, stateManager, soldier }) => {
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

    nearbyUnits.forEach((unit) => {
      if (unit === soldier) return;

      let overlapExpectedPos =
        new SAT.Vector()
          .copy(unit.expectedPosition)
          .sub(soldier.expectedPosition)
          .len() <= SoldierConstants.MAX_TARGETPOS_OVERLAP_DIST;

      let eitherAtDest =
        unit.hasReachedDestination() || soldier.hasReachedDestination();

      if (eitherAtDest && overlapExpectedPos) {
        unit.isAtDestination = soldier.isAtDestination = true;
        soldier.expectedPosition.copy(soldier.pos);
        if (!stateMachineTrigged)
          soldier.stateMachine.controller.send("ReachedPosition");
      }
    });
  },

  Attack: ({ delta, updateManager, stateManager, soldier }) => {
    if (!soldier.AttackTargetSoldier) {
      soldier.stateMachine.controller.send("TargetLost");
    }
    let distToTarget = new SAT.Vector()
      .copy(soldier.AttackTargetSoldier.pos)
      .sub(soldier.pos)
      .len();
    if (distToTarget > SoldierConstants.DESIRED_DIST_FROM_TARGET) {
      soldier.stateMachine.controller.send("TargetNotInRange");
      return;
    }

    soldier.AttackTargetSoldier.attackMe(delta, soldier);

    //schedule update to client about attack on enemy soldier.
    updateManager.queueServerEvent({
      type: PacketType.ByServer.SOLDIER_ATTACKED,
      a: soldier.getSnapshot(),
      b: soldier.AttackTargetSoldier.getSnapshot(),
    });

    //if attacked soldier unit dead, update server-state and schedule update for client.
    if (soldier.AttackTargetSoldier.health === 0) {
      updateManager.queueServerEvent({
        type: PacketType.ByServer.SOLDIER_KILLED,
        playerId: soldier.AttackTargetSoldier.playerId,
        soldierId: soldier.AttackTargetSoldier.id,
      });
      stateManager.removeSoldier(
        soldier.AttackTargetSoldier.playerId,
        soldier.AttackTargetSoldier.id
      );
      soldier.AttackTargetSoldier = null;
      soldier.stateMachine.controller.send("TargetKilled");
    }
  },

  FindTarget: ({ delta, updateManager, stateManager, soldier }) => {
    try {
      soldier.AttackTargetSoldier = null;
      var nearbyUnits = stateManager.scene.getNearbyUnits(
        {
          x: soldier.pos.x + soldier.width / 2,
          y: soldier.pos.y + soldier.height / 2,
        },
        SoldierConstants.ENEMY_SEARCH_RADIUS
      );
      if (nearbyUnits.length < 2) {
        soldier.stateMachine.controller.send("TargetNotFound");
        return;
      }

      //Go to unit with least distance instead of random unit.
      let minDist = Math.infinity;
      let nearestUnit = null;
      nearbyUnits.forEach((unit) => {
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

      if (nearestUnit) {
        soldier.AttackTargetSoldier = nearestUnit;
        soldier.stateMachine.controller.send("TargetFound");
      } else {
        //TODO: what about expectedPosition / targetPosition
        soldier.stateMachine.controller.send("TargetNotFound");
      }
    } catch (err) {
      console.error(err);
      soldier.stateMachine.controller.send("TargetNotFound");
    }
  },

  Defend: ({ delta, updateManager, stateManager, soldier }) => {
    if (!soldier.AttackTargetSoldier) {
      soldier.stateMachine.controller.send("NoAttackerUnitNearby");
      return;
    }
    soldier.stateMachine.controller.send("AttackerUnitNearby");
  },

  ChaseTarget: ({ delta, updateManager, stateManager, soldier }) => {
    try {
      if (!soldier.AttackTargetSoldier) {
        soldier.stateMachine.controller.send("TargetLost");
        return;
      }

      let seperationForce = soldier.getSeperationVector(stateManager);
      let steerForce = soldier.getSteerVector(soldier.AttackTargetSoldier.pos);
      soldier.applyForce(seperationForce);
      soldier.applyForce(steerForce);

      soldier.targetPosition.copy(soldier.AttackTargetSoldier.pos);
      soldier.expectedPosition.copy(soldier.AttackTargetSoldier.pos);

      updateManager.queueServerEvent({
        type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
        soldier: soldier.getSnapshot(),
      });

      let distToTarget = new SAT.Vector()
        .copy(soldier.AttackTargetSoldier.pos)
        .sub(soldier.pos)
        .len();
      if (distToTarget <= SoldierConstants.DESIRED_DIST_FROM_TARGET) {
        soldier.stateMachine.controller.send("TargetInRange");
      }
    } catch (err) {
      console.log(err);
      soldier.targetPosition.copy(soldier.AttackTargetSoldier.pos);
      soldier.expectedPosition.copy(soldier.targetPosition);
      soldier.AttackTargetSoldier = null;
    }
  },
};
