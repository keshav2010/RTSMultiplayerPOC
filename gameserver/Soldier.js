const PacketType = require("../common/PacketType");
const SAT = require("sat"); //(w,h)

const SoldierStateMachineJSON = require("./stateMachines/SoldierStateMachine.json");
const { createMachine, interpret } = require("xstate");
const StateMachine = require("../common/StateMachine");

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

    this.senseRadius = 50;

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

    this.id = "" + Soldier.sid;
    this.playerId = "" + params.playerId;

    Soldier.sid++;
    this.stateMachine = new StateMachine(SoldierStateMachineJSON);

    //Boid
    this.steeringVector = new SAT.Vector(0, 0);
    this.accelerationVector = new SAT.Vector(0, 0);
    this.velocityVector = new SAT.Vector(0, 0);
    //this.pos => current location
  }

  //get steering force
  setTargetVector(targetVector) {
    this.targetVector = targetVector;
  }
  applyForce(forceVector) {
    this.accelerationVector.add(forceVector);
    if (this.accelerationVector.len() > 1.4) {
      this.accelerationVector.normalize().scale(1.4);
    }
  }
  setPosition(vec) {
    this.pos = new SAT.Vector().copy(vec);
    this.x = this.pos.x;
    this.y = this.pos.y;
  }
  hasReachedDestination() {
    let diffVector = new SAT.Vector().copy(this.targetPosition).sub(this.pos);
    return diffVector.len() < this.width || this.isAtDestination;
  }

  setTargetPosition(x, y) {
    this.targetPosition = new SAT.Vector(x, y);
    this.expectedPosition = new SAT.Vector(x, y);
    this.isAtDestination =
      new SAT.Vector().copy(this.pos).sub(new SAT.Vector(x, y)).len() < 15;
    this.attackTarget = null;
    this.stateMachine.controller.send("Move");
  }

  //Returns a vector
  getSteerVector(targetVector) {
    var desiredVector = new SAT.Vector().copy(targetVector).sub(this.pos);

    //if velocity is 0, then steer vector is same as desired.
    var steerVector = new SAT.Vector()
      .copy(desiredVector)
      .sub(this.velocityVector);

    return steerVector;
  }
  getSeperationVector(stateManager) {
    let desiredSeperation = this.width*2;
    const searchRadius = 45;
    let nearbyUnits = stateManager.scene.getNearbyUnits(this, searchRadius);
    let sumVec = new SAT.Vector(0);
    if (nearbyUnits.length < 2) {
      return sumVec;
    }
    nearbyUnits.forEach((unit) => {
      if (this === unit) return;
      let distanceBetweenUnits = new SAT.Vector()
        .copy(this.pos)
        .sub(unit.pos)
        .len();

      if (distanceBetweenUnits > 0) {
        let repelUnitVector = new SAT.Vector().copy(this.pos).sub(unit.pos);
        repelUnitVector.scale(desiredSeperation/distanceBetweenUnits);
        sumVec.add(repelUnitVector);
      }
    });
    var steer = new SAT.Vector().copy(sumVec).sub(this.velocityVector);
    return steer;
  }
  tick(delta, updateManager, stateManager) {
    let seperationForce = this.getSeperationVector(stateManager);
    let steerForce = this.getSteerVector(this.expectedPosition);

    this.applyForce(steerForce);
    this.applyForce(seperationForce.scale(0.01));

    //recompute new velocity.
    this.velocityVector.add(this.accelerationVector);
    if (this.velocityVector.len() > this.speed)
      this.velocityVector.normalize().scale(this.speed);

    //move
    this.setPosition(new SAT.Vector().copy(this.pos).add(this.velocityVector));

    /*
    TODO: Fix this
    //check if nearby unit is sharing same destination and has reached there => stop
    var nearbyUnits = stateManager.scene.getNearbyUnits(this, 50);
    nearbyUnits.forEach((unit) => {
      if (unit === this) return;
      let diffVec = new SAT.Vector(0)
        .copy(unit.targetPosition)
        .sub(this.targetPosition);

      //TODO: not correct
      if (
        diffVec.len() < this.width * 3 &&
        (unit.hasReachedDestination() || this.hasReachedDestination())
      ) {
        unit.isAtDestination = this.isAtDestination = true;
      }
      unit.expectedPosition.copy(unit.pos);
      this.expectedPosition.copy(this.pos);
    });
    */
    

    //check hard collisions (hitbox touches)
    stateManager.scene.checkOne(this, (res, collidingBodies) => {
      let a = res.a;
      let b = res.b;

      var bothBodiesHaveOverlappingTarget =
        new SAT.Vector().copy(a.targetPosition).sub(b.targetPosition).len() < 5;

      var eitherReachedDest =
        a.hasReachedDestination() || b.hasReachedDestination();
      if (bothBodiesHaveOverlappingTarget && eitherReachedDest) {
        a.isAtDestination = b.isAtDestination = true;
      }

      a.setPosition(
        new SAT.Vector(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y)
      );

      var eitherAtDestination =
        a.hasReachedDestination() || b.hasReachedDestination();
      bothBodiesHaveOverlappingTarget =
        new SAT.Vector().copy(a.targetPosition).sub(b.targetPosition).len() < 5;

      if (bothBodiesHaveOverlappingTarget && eitherAtDestination) {
        a.expectedPosition.copy(a);
        b.expectedPosition.copy(b);
      }
    });
    updateManager.queueServerEvent({
      type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
      soldier: this.getSnapshot(),
    });
    //if attack target set, chase them and/or attack
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
    this.accelerationVector.scale(0);
  }

  Idle(delta, updateManager, stateManager) {
    //in idle state
  }

  Move(delta, updateManager, stateManager) {
    let distanceToExpectedPosition = new SAT.Vector()
      .copy(this.pos)
      .sub(this.expectedPosition);
    if (distanceToExpectedPosition.len() < 15) {
      this.expectedPosition.copy(this.pos);
      this.stateMachine.controller.send("ReachedPosition");
    }
  }
  Attack(delta, updateManager, stateManager) {
    let diffVector = new SAT.Vector().copy(this.attackTarget.pos).sub(this.pos);
    if (diffVector.len() > this.width) {
      this.stateMachine.controller.send("TargetNotInRange");
      return;
    }
    console.log("attack ", this.attackTarget);
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
        console.log(
          "attackTarget is not defined, current state = ",
          this.stateMachine.currentState
        );
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

      //this.parent.stateManager.scene.updateBody(this);
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
    return {
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
