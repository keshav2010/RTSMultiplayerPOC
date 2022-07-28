const PacketType = require("../common/PacketType");
const SAT = require("sat"); //(w,h)

const SoldierStateMachineJSON = require("./stateMachines/SoldierStateMachine.json");
const { createMachine, interpret } = require("xstate");
const StateMachine = require("../common/StateMachine");
const SoldierConstants = require('./unitConstants');

function mapRange(val, mapRangeStart, mapRangeEnd, targetRangeStart, targetRangeEnd)
{
  let givenRange = mapRangeEnd - mapRangeStart;
  let targetRange = targetRangeEnd - targetRangeStart;
  let normalizedGivenRange = (val - mapRangeStart)/givenRange;
  return targetRangeStart + normalizedGivenRange*targetRange;
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
  static sid = 0;
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

    //compromised position possible for agent
    this.expectedPosition = new SAT.Vector(params.x, params.y);

    //actual position requested by client
    this.targetPosition = new SAT.Vector(params.x, params.y);

    //Soldier whom we need to attack
    this.attackTarget = null;

    this.isAtDestination = true;

    this.soldierType = type;

    this.health = params.health || 100;
    this.speed = params.speed || 5;
    this.cost = params.cost || 5;
    this.damage = params.damage || 5;

    this.id = String(Soldier.sid);
    this.playerId = String(params.playerId);
    Soldier.sid++;
    this.stateMachine = new StateMachine(SoldierStateMachineJSON);

    //Boid
    this.steeringVector = new SAT.Vector(0, 0);
    this.accelerationVector = new SAT.Vector(0, 0);
    this.velocityVector = new SAT.Vector(0, 0);
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

  hasReachedDestination() {
    let distanceToExpectedPos = new SAT.Vector()
      .copy(this.expectedPosition)
      .sub(this.pos)
      .len();
    if (distanceToExpectedPos <= SoldierConstants.DESIRED_DIST_FROM_TARGET) {
      //this.expectedPosition.copy(this.pos);
      this.isAtDestination = true;
    }
    else {
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
    var desiredVector = new SAT.Vector().copy(expectedPos).sub(this.pos)
    var distance = desiredVector.len();
    desiredVector.normalize();
    if(distance < SoldierConstants.DESIRED_DIST_FROM_TARGET){
      desiredVector.scale(mapRange(distance, 0, SoldierConstants.DESIRED_DIST_FROM_TARGET, 0, this.speed));
    }
    else desiredVector.scale(this.speed);

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

  tick(delta, updateManager, stateManager) {
    this.velocityVector.add(this.accelerationVector);
    if (this.velocityVector.len() > this.speed)
      this.velocityVector.normalize().scale(this.speed);
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

    switch (this.stateMachine.currentState) {
      case "Idle":
        this.Idle(delta, updateManager, stateManager);
        break;
      case "Move":
        this.Move(delta, updateManager, stateManager);
        break;
      case "ChaseTarget":
        this.ChaseTarget(delta, updateManager, stateManager);
        break;
      case "Attack":
        this.Attack(delta, updateManager, stateManager);
        break;
      case "FindTarget":
        this.FindTarget(delta, updateManager, stateManager);
        break;
      case "Defend":
        this.Defend(delta, updateManager, stateManager);
        break;
      default:
        this.Idle(delta, updateManager, stateManager);
        break;
    }

    updateManager.queueServerEvent({
      type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
      soldier: this.getSnapshot(),
    });
  }

  /**
   * Always scan for seperation force
   */
  Idle(delta, updateManager, stateManager) {

    //repel from only those units which are not yet at their destination.
    let seperationForce = this.getSeperationVector(stateManager, (a, b) => {
      return a.hasReachedDestination() && b.hasReachedDestination();
    });

    this.applyForce(seperationForce);
    if (this.velocityVector.len() > 0 || !this.hasReachedDestination()){
      this.stateMachine.controller.send("Move");
    }
  }
  Move(delta, updateManager, stateManager) {
    let seperationForce = this.getSeperationVector(stateManager);
    let steerForce = this.getSteerVector(this.expectedPosition);
    this.applyForce(seperationForce);
    this.applyForce(steerForce);

    let stateMachineTrigged = false;
    if (this.hasReachedDestination()) {
      this.stateMachine.controller.send("ReachedPosition");
      stateMachineTrigged = true;
    }

    var nearbyUnits = stateManager.scene.getNearbyUnits(
      {
        x: this.pos.x + this.width / 2,
        y: this.pos.y + this.height / 2,
      },
      SoldierConstants.NEARBY_SEARCH_RADI
    );
    if (nearbyUnits.length < 2) return;

    nearbyUnits.forEach((unit) => {
      if (unit === this)
        return;

      let overlapExpectedPos =
        new SAT.Vector()
          .copy(unit.expectedPosition)
          .sub(this.expectedPosition)
          .len() <= SoldierConstants.MAX_TARGETPOS_OVERLAP_DIST;

      let eitherAtDest =
        unit.hasReachedDestination() || this.hasReachedDestination();

      if (eitherAtDest && overlapExpectedPos) {
        unit.isAtDestination = this.isAtDestination = true;
        this.expectedPosition.copy(this.pos);
        if (!stateMachineTrigged)
          this.stateMachine.controller.send("ReachedPosition");
      }
    });
  }
  Attack(delta, updateManager, stateManager) {
    let diffVector = new SAT.Vector().copy(this.attackTarget.pos).sub(this.pos);
    if (diffVector.len() > this.width) {
      this.stateMachine.controller.send("TargetNotInRange");
      return;
    }
    this.attackTarget.health -= delta * this.damage;
    this.health -= delta * this.attackTarget.damage;

    this.attackTarget.health = Math.max(0, this.attackTarget.health);
    this.health = Math.max(0, this.health);

    updateManager.queueServerEvent({
      type: PacketType.ByServer.SOLDIER_ATTACKED,
      a: this.getSnapshot(),
      b: this.attackTarget.getSnapshot(),
    });

    if (this.attackTarget.health === 0) {
      updateManager.queueServerEvent({
        type: PacketType.ByServer.SOLDIER_KILLED,
        playerId: this.attackTarget.playerId,
        soldierId: this.attackTarget.id,
      });
      stateManager.removeSoldier(
        this.attackTarget.playerId,
        this.attackTarget.id
      );
    }
    if (this.health === 0) {
      updateManager.queueServerEvent({
        type: PacketType.ByServer.SOLDIER_KILLED,
        playerId: this.playerId,
        soldierId: this.id,
      });
      stateManager.removeSoldier(this.playerId, this.id);
      return;
    }
  }
  FindTarget(delta, updateManager, stateManager) {
    try {
    } catch (err) {}
  }
  Defend(delta, updateManager, stateManager) {
    //also same as attack
  }
  ChaseTarget(delta, updateManager, stateManager) {
    try {
      if (!this.attackTarget) {
        return;
      }
      //if target-soldier not found, cancel the hunt
      if (
        !stateManager.SocketToPlayerData.get(
          this.attackTarget.playerId
        ).getSoldier(this.attackTarget.id)
      ) {
        this.targetPosition.copy(this.pos);
        this.expectedPosition.copy(this.pos);
        this.attackTarget = null;
        return;
      }
      this.targetPosition.copy(this.attackTarget.pos);
      this.expectedPosition.copy(this.attackTarget.pos);

      updateManager.queueServerEvent({
        type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
        soldier: this.getSnapshot(),
      });
    } catch (err) {
      console.log(err);
      this.targetPosition.copy(this.attackTarget.pos);
      this.expectedPosition.copy(this.targetPosition);
      this.attackTarget = null;
    }
  }
  attackUnit(unitReference) {
    this.attackTarget = unitReference;
    this.stateMachine.controller.send("Attack");
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
    };
    return soldierData;
  }

  //sort of like a destructor
  clearObject(stateManager) {
    if (stateManager) {
      this.attackTarget = null;

      this.parent = null;
      stateManager.scene.remove(this);
    } else console.log("Soldier failed to be cleared from Collision-System");
  }
}
module.exports = Soldier;
