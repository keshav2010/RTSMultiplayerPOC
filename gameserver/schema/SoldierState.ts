import { Schema, type } from "@colyseus/schema";
import { nanoid } from "nanoid";
import { SoldierType } from "../../common/SoldierType";
import { CustomStateMachine } from "../core/CustomStateMachine";
import SoldierStateMachineJSON from "../stateMachines/soldier-state-machine/SoldierStateMachine.json";
import soldierStateBehaviours from "../stateMachines/soldier-state-machine/SoldierStateBehaviour";
import { GameStateManager } from "../core/GameStateManager";
import { SceneObject } from "../core/SceneObject";
import { AllianceTypes } from "../AllianceTracker";

function mapRange(
  val: number,
  mapRangeStart: number,
  mapRangeEnd: number,
  targetRangeStart: number,
  targetRangeEnd: number
) {
  let givenRange = mapRangeEnd - mapRangeStart;
  let targetRange = targetRangeEnd - targetRangeStart;
  let normalizedGivenRange = (val - mapRangeStart) / givenRange;
  return targetRangeStart + normalizedGivenRange * targetRange;
}

const MOVABLE_UNIT_CONSTANTS = {
  MAX_STEER_FORCE: 5,
  MAX_REPEL_FORCE: 20,

  MAX_ACCELERATION: 1.2,
  DESIRED_DIST_FROM_TARGET: 50,
  ACCEPTABLE_DIST_FROM_EXPECTED_POS: 2,
  NEARBY_SEARCH_RADI: 150,
  ENEMY_SEARCH_RADIUS: 200,
  DESIRED_SEPERATION_DIST: 90, //to initiate repulsion force
  MAX_TARGETPOS_OVERLAP_DIST: 40,
};

export class SoldierState extends Schema {
  @type("number") currentPositionX: number = 0;
  @type("number") currentPositionY: number = 0;

  // pos possible for agent. (fallback for targetPosition)
  @type("number") expectedPositionX: number = 0;
  @type("number") expectedPositionY: number = 0;

  // pos requested by client.
  @type("number") targetPositionX: number = 0;
  @type("number") targetPositionY: number = 0;

  @type("string") type: SoldierType = "SPEARMAN";

  @type("number") width: number = 32;
  @type("number") height: number = 32;

  @type("number") health: number = 100;
  @type("number") speed: number = 12;
  @type("number") damage: number = 2;
  @type("number") cost: number = 10;

  @type("string") id: string = nanoid();
  @type("string") playerId!: string;

  // Debug Information
  @type("string") currentState: keyof typeof SoldierStateMachineJSON.states;

  soldier!: SceneObject;
  attackTarget: SoldierState | null = null;

  targetVector: SAT.Vector | null = null;
  steeringVector: SAT.Vector = new SAT.Vector(0, 0);
  accelerationVector: SAT.Vector = new SAT.Vector(0, 0);
  velocityVector: SAT.Vector = new SAT.Vector(0, 0);

  isAtDestination: boolean = false;

  stateMachine = new CustomStateMachine<{
    delta: number;
    stateManager: GameStateManager<SoldierState>;
    soldier: SoldierState;
  }>(SoldierStateMachineJSON, soldierStateBehaviours);

  constructor(
    playerId: string,
    soldierType: SoldierType,
    x: number,
    y: number
  ) {
    super();
    this.id = nanoid();
    this.playerId = playerId;
    this.currentState = this.getState();
    this.attackTarget = null;
    this.targetVector = null;

    this.currentPositionX = x;
    this.currentPositionY = y;

    this.expectedPositionX = x;
    this.expectedPositionY = y;

    this.targetPositionX = x;
    this.targetPositionY = y;

    this.type = soldierType;

    this.health = 100;
    this.speed = 10;
    this.damage = 1;
    this.cost = 10;

    this.soldier = new SceneObject(this.id, x, y, 32, 32);
  }

  getSceneItem() {
    return this.soldier as SceneObject;
  }

  getExpectedPosition() {
    return new SAT.Vector(this.expectedPositionX, this.expectedPositionY);
  }

  setExpectedPos(x: number, y: number) {
    this.expectedPositionX = x;
    this.expectedPositionY = y;
  }

  setAttackTarget(target: SoldierState | null) {
    this.attackTarget = target;
  }
  getAttackTarget() {
    return this.attackTarget;
  }
  setTargetVector(vector: SAT.Vector) {
    this.targetVector = new SAT.Vector(vector.x, vector.y);
  }
  applyForce(forceVector: SAT.Vector) {
    this.accelerationVector.add(forceVector);
    const isAccelerationAtMax =
      this.accelerationVector.len() > MOVABLE_UNIT_CONSTANTS.MAX_ACCELERATION;
    if (isAccelerationAtMax) {
      this.accelerationVector
        .normalize()
        .scale(MOVABLE_UNIT_CONSTANTS.MAX_ACCELERATION);
    }
  }

  setPosition(vec: SAT.Vector) {
    this.soldier.pos = new SAT.Vector().copy(vec);
    this.currentPositionX = vec.x;
    this.currentPositionY = vec.y;
  }

  getDistanceFromMovePos() {
    const expectedPos = new SAT.Vector(
      this.expectedPositionX,
      this.expectedPositionY
    );
    let distanceToExpectedPos = new SAT.Vector()
      .copy(expectedPos)
      .sub(this.soldier.pos)
      .len();
    return distanceToExpectedPos;
  }

  hasReachedDestination() {
    let distanceToExpectedPos = this.getDistanceFromMovePos();
    if (
      distanceToExpectedPos <= MOVABLE_UNIT_CONSTANTS.DESIRED_DIST_FROM_TARGET
    ) {
      this.isAtDestination = true;
    } else {
      this.isAtDestination = false;
    }
    return this.isAtDestination;
  }

  setTargetPosition(vec: SAT.Vector) {
    this.targetPositionX = vec.x;
    this.targetPositionY = vec.y;
  }
  setExpectedPosition(vec: SAT.Vector) {
    this.expectedPositionX = vec.x;
    this.expectedPositionY = vec.y;
  }

  getState() {
    return `${this.stateMachine.currentState}` as keyof typeof SoldierStateMachineJSON.states;
  }

  getSteerVector(expectedPos: SAT.Vector) {
    const desiredVector = new SAT.Vector()
      .copy(expectedPos)
      .sub(this.soldier.pos);

    const distance = desiredVector.len();
    desiredVector.normalize();

    if (distance < MOVABLE_UNIT_CONSTANTS.DESIRED_DIST_FROM_TARGET) {
      desiredVector.scale(0);
    } else desiredVector.scale(this.speed);

    var steerVector = new SAT.Vector()
      .copy(desiredVector)
      .sub(this.velocityVector);
    if (steerVector.len() > MOVABLE_UNIT_CONSTANTS.MAX_STEER_FORCE)
      steerVector.normalize().scale(MOVABLE_UNIT_CONSTANTS.MAX_STEER_FORCE);
    return steerVector;
  }

  getSeperationVector(
    stateManager: GameStateManager<SoldierState>,
    excludeUnitPredicate?: any
  ) {
    const nearbyUnits = stateManager.scene.getNearbyUnits(
      this.soldier.pos.x + this.soldier.w / 2,
      this.soldier.pos.y + this.soldier.h / 2,
      MOVABLE_UNIT_CONSTANTS.NEARBY_SEARCH_RADI
    );

    let sumVec = new SAT.Vector(0);
    if (nearbyUnits.length < 2) return sumVec;

    nearbyUnits.forEach((unit) => {
      if (this.id === unit.id) return;
      if (
        excludeUnitPredicate &&
        typeof excludeUnitPredicate === "function" &&
        excludeUnitPredicate(this, unit)
      )
        return;
      let distanceBetweenUnits = new SAT.Vector()
        .copy(this.soldier.pos)
        .sub(new SAT.Vector(unit.x, unit.y))
        .len();

      if (
        distanceBetweenUnits > 0 &&
        distanceBetweenUnits <= MOVABLE_UNIT_CONSTANTS.DESIRED_SEPERATION_DIST
      ) {
        let repelUnitVector = new SAT.Vector()
          .copy(this.soldier.pos)
          .sub(new SAT.Vector(unit.x, unit.y));
        repelUnitVector.scale(
          MOVABLE_UNIT_CONSTANTS.DESIRED_SEPERATION_DIST / distanceBetweenUnits
        );
        sumVec.add(repelUnitVector);
      }
    });
    var steer = new SAT.Vector().copy(sumVec);
    if (sumVec.len() > 0) steer.sub(this.velocityVector);
    if (steer.len() > MOVABLE_UNIT_CONSTANTS.MAX_REPEL_FORCE)
      steer.normalize().scale(MOVABLE_UNIT_CONSTANTS.MAX_REPEL_FORCE);
    return steer;
  }

  attackUnit(
    targetSoldier: SoldierState,
    stateManager: GameStateManager<SoldierState>
  ) {
    this.setAttackTarget(targetSoldier);
    stateManager.setAlliance(
      this.playerId,
      targetSoldier.playerId,
      AllianceTypes.ENEMIES
    );
    this.stateMachine.controller.send("Attack");
  }

  takeDamage(
    delta: number,
    attackerUnit: SoldierState,
    stateManager: GameStateManager<SoldierState>
  ) {
    if (!attackerUnit || !stateManager) return;

    this.health -= delta * attackerUnit.damage;
    this.health = Math.max(0, this.health);

    this.setAttackTarget(attackerUnit);

    this.stateMachine.controller.send("PlayerAttacked");
  }

  tick(delta: number, stateManager: GameStateManager<SoldierState>) {

    //if object is moving, we apply -2 frictionForce to it.
    this.velocityVector.add(this.accelerationVector);
    if (this.velocityVector.len() > this.speed)
      this.velocityVector.normalize().scale(this.speed*delta);
    let frictionForce = new SAT.Vector()
      .copy(this.velocityVector)
      .normalize()
      .scale(-0.2*delta);
    this.velocityVector.add(frictionForce);

    this.accelerationVector.scale(0);
    this.setPosition(
      new SAT.Vector().copy(this.soldier.pos).add(this.velocityVector.scale(delta))
    );

    //hard collisions
    stateManager.scene.checkOne(
      this,
      (
        res: { a: any; b: any; overlapV: { x: number; y: number } },
        collidingBodies: any
      ) => {
        let a = res.a;
        let b = res.b;
        a.setPosition(
          new SAT.Vector(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y)
        );

        let overlappingTargetPos =
          new SAT.Vector()
            .copy(a.expectedPosition)
            .sub(b.expectedPosition)
            .len() <= MOVABLE_UNIT_CONSTANTS.MAX_TARGETPOS_OVERLAP_DIST;

        var eitherReachedDest =
          a.hasReachedDestination() || b.hasReachedDestination();
        if (overlappingTargetPos && eitherReachedDest) {
          a.expectedPosition.copy(a.pos);
          b.expectedPosition.copy(b.pos);
        }
      }
    );

    this.stateMachine.tick({ delta, stateManager, soldier: this });
  }
}
