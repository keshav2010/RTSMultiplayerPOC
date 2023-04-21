const PacketType = require("../common/PacketType");
const SAT = require("sat"); //(w,h)

const SoldierStateMachineJSON = require("./stateMachines/soldier-state-machine/SoldierStateMachine.json");
const soldierStateBehaviours = require("./stateMachines/soldier-state-machine/SoldierStateBehaviour");

const StateMachine = require("./lib/StateMachine");
const SoldierConstants = require("./unitConstants");
const { AllianceTypes } = require("./lib/AllianceTracker");
const { v4: uuidv4 } = require("uuid");

function mapRange(
  val,
  mapRangeStart,
  mapRangeEnd,
  targetRangeStart,
  targetRangeEnd
) {
  let givenRange = mapRangeEnd - mapRangeStart;
  let targetRange = targetRangeEnd - targetRangeStart;
  let normalizedGivenRange = (val - mapRangeStart) / givenRange;
  return targetRangeStart + normalizedGivenRange * targetRange;
}
/**
 * SAT BOX Interface    |   * QUADTREE Object Interface
 * ---------            |   * ---------
 * pos {x,y}            |   * {x, y, width, height}
 * r                    |
 * offset               |
 * setOffset(offset)    |
 * getAABB()            |
 * getAABBAsBox()       |
 */
class Soldier extends SAT.Box {
  constructor(type, params, parentObject) {
    // {pos:{x,y}}
    super(
      new SAT.Vector(params.x, params.y),
      params.width || 35,
      params.height || 35
    );
    this.parent = parentObject;

    //used by quadtrees
    this.x = this.pos.x;
    this.y = this.pos.y;
    this.width = this.w;
    this.height = this.h;

    //position possible for agent
    this.expectedPosition = new SAT.Vector(params.x, params.y);

    //actual position requested by client
    this.targetPosition = new SAT.Vector(params.x, params.y);

    this.isAtDestination = true;

    this.soldierType = type;

    this.health = params.health || 100;
    this.speed = params.speed || 5;
    this.cost = params.cost || 5;
    this.damage = params.damage || 5;

    this.id = `soldier${uuidv4()}`
    this.playerId = String(params.playerId);

    this.stateMachine = new StateMachine(SoldierStateMachineJSON, soldierStateBehaviours);

    //Boid
    this.steeringVector = new SAT.Vector(0, 0);
    this.accelerationVector = new SAT.Vector(0, 0);
    this.velocityVector = new SAT.Vector(0, 0);
  }

  setAttackTarget(stateManager, playerId, soldierId) {
    let player = stateManager.getPlayerById(playerId);
    let soldier = player?.getSoldier(soldierId);
    if(!player || !soldier){
      this.attackTarget = null;
      return null;
    }
    this.attackTarget = { playerId, soldierId };
    return this.attackTarget;
  }
  getAttackTarget(stateManager) {
    if(!this.attackTarget)
      return null;
    let player = stateManager.getPlayerById(this.attackTarget.playerId);
    let soldier = player?.getSoldier(this.attackTarget.soldierId);
    if(!player || !soldier){
      this.attackTarget = null;
      return null;
    }
    return {player, soldier};
  }

  //get steering force
  setTargetVector(targetVector) {
    this.targetVector = targetVector;
  }
  applyForce(forceVector) {
    this.accelerationVector.add(forceVector);
    if (this.accelerationVector.len() > SoldierConstants.MAX_ACCELERATION) {
      this.accelerationVector
        .normalize()
        .scale(SoldierConstants.MAX_ACCELERATION);
    }
  }
  setPosition(vec) {
    this.pos = new SAT.Vector().copy(vec);
    this.x = this.pos.x;
    this.y = this.pos.y;
  }

  getDistanceFromMovePos() {
    let distanceToExpectedPos = new SAT.Vector()
      .copy(this.expectedPosition)
      .sub(this.pos)
      .len();
    return distanceToExpectedPos;
  }

  hasReachedDestination() {
    let distanceToExpectedPos = this.getDistanceFromMovePos();
    if (distanceToExpectedPos <= SoldierConstants.DESIRED_DIST_FROM_TARGET) {
      //this.expectedPosition.copy(this.pos);
      this.isAtDestination = true;
    } else {
      this.isAtDestination = false;
    }
    return this.isAtDestination;
  }

  setTargetPosition(x, y) {
    this.targetPosition = new SAT.Vector(x, y);
    this.expectedPosition = new SAT.Vector(x, y);
    this.hasReachedDestination();
    this.attackTarget = null;
    this.stateMachine.controller.send("Move");
  }

  getSteerVector(expectedPos) {
    var desiredVector = new SAT.Vector().copy(expectedPos).sub(this.pos);
    var distance = desiredVector.len();
    desiredVector.normalize();
    if (distance < SoldierConstants.DESIRED_DIST_FROM_TARGET) {
      desiredVector.scale(
        mapRange(
          distance,
          0,
          SoldierConstants.DESIRED_DIST_FROM_TARGET,
          0,
          this.speed
        )
      );
      desiredVector.scale(0);
    } else desiredVector.scale(this.speed);

    var steerVector = new SAT.Vector()
      .copy(desiredVector)
      .sub(this.velocityVector);
    if (steerVector.len() > SoldierConstants.MAX_STEER_FORCE)
      steerVector.normalize().scale(SoldierConstants.MAX_STEER_FORCE);
    return steerVector;
  }

  getSeperationVector(stateManager, excludeUnitPredicate) {
    let nearbyUnits = stateManager.scene.getNearbyUnits(
      {
        x: this.pos.x + this.width / 2,
        y: this.pos.y + this.height / 2,
      },
      SoldierConstants.NEARBY_SEARCH_RADI
    );

    let sumVec = new SAT.Vector(0);
    if (nearbyUnits.length < 2) return sumVec;

    nearbyUnits.forEach((unit) => {
      if (this === unit) return;
      if (
        excludeUnitPredicate &&
        typeof excludeUnitPredicate === "function" &&
        excludeUnitPredicate(this, unit)
      )
        return;
      let distanceBetweenUnits = new SAT.Vector()
        .copy(this.pos)
        .sub(unit.pos)
        .len();

      if (
        distanceBetweenUnits > 0 &&
        distanceBetweenUnits <= SoldierConstants.DESIRED_SEPERATION_DIST
      ) {
        let repelUnitVector = new SAT.Vector().copy(this.pos).sub(unit.pos);
        repelUnitVector.scale(
          SoldierConstants.DESIRED_SEPERATION_DIST / distanceBetweenUnits
        );
        sumVec.add(repelUnitVector);
      }
    });
    var steer = new SAT.Vector().copy(sumVec);
    if (sumVec.len() > 0) steer.sub(this.velocityVector);
    if (steer.len() > SoldierConstants.MAX_REPEL_FORCE)
      steer.normalize().scale(SoldierConstants.MAX_REPEL_FORCE);
    return steer;
  }

  tick(delta, stateManager) {
    //if object is moving, we apply -2 frictionForce to it.
    this.velocityVector.add(this.accelerationVector);
    if (this.velocityVector.len() > this.speed)
      this.velocityVector.normalize().scale(this.speed);
    let frictionForce = new SAT.Vector().copy(this.velocityVector).normalize().scale(-0.2);
    this.velocityVector.add(frictionForce);
    
    this.accelerationVector.scale(0);
    this.setPosition(new SAT.Vector().copy(this.pos).add(this.velocityVector));

    //hard collisions
    stateManager.scene.checkOne(this, (res, collidingBodies) => {
      let a = res.a;
      let b = res.b;
      a.setPosition(
        new SAT.Vector(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y)
      );

      let overlappingTargetPos =
        new SAT.Vector()
          .copy(a.expectedPosition)
          .sub(b.expectedPosition)
          .len() <= SoldierConstants.MAX_TARGETPOS_OVERLAP_DIST;

      var eitherReachedDest =
        a.hasReachedDestination() || b.hasReachedDestination();
      if (overlappingTargetPos && eitherReachedDest) {
        a.expectedPosition.copy(a.pos);
        b.expectedPosition.copy(b.pos);
      }
    });

    this.stateMachine.tick({delta, stateManager, soldier: this});

    stateManager.enqueueStateUpdate({
      type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
      soldier: this.getSnapshot(),
    });
  }

  attackUnit(targetSoldier, stateManager) {
    this.setAttackTarget(stateManager, targetSoldier?.playerId, targetSoldier.id);
    stateManager.setAlliance(this.playerId, targetSoldier?.playerId, AllianceTypes.ENEMIES);
    this.stateMachine.controller.send("Attack");
  }

  attackMe(delta, attackerUnit, stateManager) {
    if(!attackerUnit || !stateManager)
      throw new Error("attackerUnit or stateManager parameter is undefined/null.");
    this.health -= delta * attackerUnit.damage;
    this.health = Math.max(0, this.health);
    this.setAttackTarget(stateManager, attackerUnit.playerId, attackerUnit.id);
    this.stateMachine.controller.send("PlayerAttacked");
  }

  getCurrentState() {
      return `${this.stateMachine.currentState}`;
  }
  //Returns a perfectly serializable object with no refs, this object can be shared between threads
  getSnapshot() {
    let soldierData = {
      currentPositionX: this.pos.x,
      currentPositionY: this.pos.y,

      expectedPositionX: this.expectedPosition.x,
      expectedPositionY: this.expectedPosition.y,

      type: this.soldierType,

      //Collider
      width: this.w,
      height: this.h,

      health: this.health,
      speed: this.speed,
      damage: this.damage,
      cost: this.cost,

      id: this.id,
      playerId: this.playerId,


      //DEBUG Purpose only.
      currentState: this.getCurrentState()
    };
    return soldierData;
  }
}
module.exports = Soldier;
