import { Schema, type } from "@colyseus/schema";
import { nanoid } from "nanoid";
import { SoldierType, SoldierTypeConfig } from "../../common/SoldierType";
import { CustomStateMachine } from "../core/CustomStateMachine";
import SoldierStateMachineJSON from "../stateMachines/soldier-state-machine/SoldierStateMachine.json";
import soldierStateBehaviours from "../stateMachines/soldier-state-machine/SoldierStateBehaviour";
import { SceneObject } from "../core/types/SceneObject";
import { AllianceTypes } from "../AllianceTracker";
import SAT from "sat";
import { MOVABLE_UNIT_CONSTANTS } from "../config";
import { GameStateManagerType, PlayerState } from "./PlayerState";
import { ISceneItem } from "../core/types/ISceneItem";
import { TypeQuadtreeItem } from "../core/types/TypeQuadtreeItem";
import { IBoidAgent } from "../core/types/IBoidAgent";
import * as helper from "../helpers";
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

export class SoldierState extends Schema implements ISceneItem, IBoidAgent {
  @type("number") currentPositionX: number = 0;
  @type("number") currentPositionY: number = 0;

  // pos possible for agent. (fallback for targetPosition)
  @type("number") expectedPositionX: number = 0;
  @type("number") expectedPositionY: number = 0;

  // pos requested by client.
  @type("number") targetPositionX: number = 0;
  @type("number") targetPositionY: number = 0;

  @type("string") type: SoldierType = "SPEARMAN";

  @type("number") radius: number = 16;

  @type("number") health: number = 100;
  @type("number") speed: number;
  @type("number") damage: number = 15;
  @type("number") cost: number = 10;

  @type("string") id: string = nanoid();
  @type("string") playerId!: string;

  // Debug Information
  @type("string") currentState: keyof typeof SoldierStateMachineJSON.states;

  sceneItemRef!: SceneObject;
  attackTarget: SoldierState | null = null;

  targetVector: SAT.Vector | null = null;

  steeringVector: SAT.Vector = new SAT.Vector(0, 0);
  velocityVector: SAT.Vector = new SAT.Vector(0, 0);

  isAtDestination = true;

  stateMachine = new CustomStateMachine<{
    delta: number;
    stateManager: GameStateManagerType;
    soldier: SoldierState;
  }>(SoldierStateMachineJSON, soldierStateBehaviours);

  groupLeaderId?: string | null;
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

    this.health = SoldierTypeConfig[this.type].health;
    this.speed = SoldierTypeConfig[this.type].speed;
    this.damage = SoldierTypeConfig[this.type].damage;
    this.cost = SoldierTypeConfig[this.type].cost;

    this.sceneItemRef = new SceneObject(
      this.id,
      x,
      y,
      this.radius * 2,
      "MOVABLE",
      true
    );
  }

  getSceneItem() {
    return this.sceneItemRef as SceneObject;
  }

  getExpectedPosition() {
    return new SAT.Vector(this.expectedPositionX, this.expectedPositionY);
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
    this.velocityVector.add(forceVector);
  }

  setPosition(vec: SAT.Vector) {
    this.sceneItemRef.pos.copy(vec);
    this.sceneItemRef.x = vec.x;
    this.sceneItemRef.y = vec.y;
    this.currentPositionX = vec.x;
    this.currentPositionY = vec.y;
  }

  getDistanceFromExpectedPosition() {
    const expectedPos = this.getExpectedPosition().clone();
    let distanceToExpectedPos = expectedPos.sub(this.getSceneItem().pos).len();
    return distanceToExpectedPos;
  }

  hasReachedDestination() {
    let distanceToExpectedPos = this.getDistanceFromExpectedPosition();
    const currentState = this.stateMachine.currentState;
    this.isAtDestination =
      distanceToExpectedPos <= 2 ||
      (distanceToExpectedPos <=
        MOVABLE_UNIT_CONSTANTS.MAX_DISTANCE_OFFSET_ALLOWED_FROM_EXPECTED_POSITION &&
        currentState !== "Idle");
    return this.isAtDestination;
  }

  setTargetPosition(vec: SAT.Vector) {
    this.targetPositionX = vec.x;
    this.targetPositionY = vec.y;
    this.expectedPositionX = vec.x;
    this.expectedPositionY = vec.y;
    this.hasReachedDestination();
    this.attackTarget = null;
    this.steeringVector.scale(0);
    this.velocityVector.scale(0);
    this.stateMachine.controller.send("Move");
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
      .sub(this.getSceneItem().pos);
    desiredVector.normalize().scale(this.speed);
    const steerVector = desiredVector.clone().sub(this.velocityVector);
    return steerVector.len() > MOVABLE_UNIT_CONSTANTS.MAX_STEER_FORCE
      ? steerVector.normalize().scale(MOVABLE_UNIT_CONSTANTS.MAX_STEER_FORCE)
      : steerVector;
  }

  getSeperationVector(
    stateManager: GameStateManagerType,
    excludeUnitPredicate?: (arg0: SoldierState, arg1: SoldierState) => boolean
  ) {
    const soldier = this.getSceneItem();
    const centerPos = soldier.getCircleCenter();
    const nearbyUnits = stateManager.scene.getNearbyUnits(
      centerPos.x,
      centerPos.y,
      MOVABLE_UNIT_CONSTANTS.NEARBY_SEARCH_RADI,
      ["MOVABLE"]
    );

    let sumVec = new SAT.Vector(0);
    if (nearbyUnits.length < 2) {
      return sumVec;
    }

    const otherSoldierUnits = nearbyUnits.filter(
      (nearbyUnit: TypeQuadtreeItem) => {
        const isSelf = this.id === nearbyUnit.id;

        const otherSoldierSchema =
          stateManager.scene.getSceneItemById<SoldierState>(nearbyUnit.id);
        if (!otherSoldierSchema) {
          return;
        }

        const isExcluded =
          (excludeUnitPredicate &&
            typeof excludeUnitPredicate === "function" &&
            excludeUnitPredicate(this, otherSoldierSchema)) ||
          false;
        return !(isSelf || isExcluded);
      }
    );

    otherSoldierUnits.forEach((unit: TypeQuadtreeItem) => {
      const distanceBetweenUnits = soldier.pos
        .clone()
        .sub(new SAT.Vector(unit.x, unit.y))
        .len();

      const unitSeperationBetweenCertainThreshold =
        distanceBetweenUnits <=
        MOVABLE_UNIT_CONSTANTS.MINIMUM_SEPERATION_DISTANCE_BETWEEN_UNITS;

      if (!unitSeperationBetweenCertainThreshold) return;

      const repelUnitVector = soldier.pos
        .clone()
        .sub(new SAT.Vector(unit.x, unit.y));
      repelUnitVector.scale(MOVABLE_UNIT_CONSTANTS.MAX_REPEL_FORCE);
      sumVec.add(repelUnitVector);
    });

    const steer = sumVec.clone();
    if (sumVec.len() > 0) steer.sub(this.velocityVector);
    if (steer.len() > MOVABLE_UNIT_CONSTANTS.MAX_REPEL_FORCE)
      steer.normalize().scale(MOVABLE_UNIT_CONSTANTS.MAX_REPEL_FORCE);
    return steer;
  }

  attackUnit(targetSoldier: SoldierState, stateManager: GameStateManagerType) {
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
    stateManager: GameStateManagerType
  ) {
    if (!attackerUnit || !stateManager) return;

    this.health -= delta * attackerUnit.damage;
    this.health = Math.max(0, this.health);

    this.setAttackTarget(attackerUnit);

    this.stateMachine.controller.send("PlayerAttacked");
  }

  getVelocityVector() {
    return this.velocityVector.clone();
  }

  tick(delta: number, stateManager: GameStateManagerType) {
    this.currentState = this.stateMachine
      .currentState as keyof typeof SoldierStateMachineJSON.states;

    stateManager.scene.checkCollisionOnObject(
      this,
      ["MOVABLE"],
      (
        res: {
          a: SoldierState;
          b: SoldierState;
          overlapV: { x: number; y: number };
        },
        collidingBodies: any
      ) => {
        let soldierA = res.a as SoldierState;
        let soldierB = res.b as SoldierState;

        if (!soldierA || !soldierB) {
          return;
        }

        // update position so it doesnt overlap with colliding body.
        soldierA.setPosition(
          new SAT.Vector(
            soldierA.currentPositionX - res.overlapV.x,
            soldierA.currentPositionY - res.overlapV.y
          )
        );

        let overlappingTargetPos =
          new SAT.Vector()
            .copy(soldierA.getExpectedPosition())
            .sub(soldierB.getExpectedPosition())
            .len() <= MOVABLE_UNIT_CONSTANTS.MAX_TARGETPOS_OVERLAP_DIST;

        var eitherReachedDest =
          soldierA.hasReachedDestination() || soldierB.hasReachedDestination();

        if (overlappingTargetPos && eitherReachedDest) {
          soldierA.setExpectedPosition(
            new SAT.Vector(soldierA.getSceneItem().x, soldierA.getSceneItem().y)
          );
          soldierB.setExpectedPosition(
            new SAT.Vector(soldierB.getSceneItem().x, soldierB.getSceneItem().y)
          );
        }
      }
    );
    const soldierCenterPosition = this.getSceneItem().getCircleCenter();

    const enemyTowers = stateManager.scene
      .getNearbyUnits(soldierCenterPosition.x, soldierCenterPosition.y, 100, [
        "FIXED",
      ])
      .filter(
        (quadtreeItem) =>
          stateManager.getPlayer(quadtreeItem.id) &&
          quadtreeItem.id !== this.playerId &&
          stateManager
            .getPlayer(quadtreeItem.id)!
            .getSceneItem()
            .getCircleCenter()
            .clone()
            .sub(soldierCenterPosition)
            .len() < 100
      )
      .map((d) => stateManager.getPlayer(d.id));

    enemyTowers.forEach((playerBase) => {
      if (!playerBase) return;
      const enemyTowerCenter = playerBase.getSceneItem().getCircleCenter();
      console.log(
        "dist = ",
        enemyTowerCenter.clone().sub(soldierCenterPosition).len()
      );
      const flagHealth = playerBase.spawnFlagHealth - 0.45 * delta;
      playerBase.spawnFlagHealth = Math.max(0, flagHealth);
    });
    this.stateMachine.tick({ delta, stateManager, soldier: this });
  }

  move(delta: number, stateManager: GameStateManagerType) {
    const steerForce = this.getSteerVector(this.getExpectedPosition());
    const seperationForce = this.getSeperationVector(
      stateManager,
      (a: SoldierState, b: SoldierState) => {
        return a.hasReachedDestination() && b.hasReachedDestination();
      }
    );
    const netForce = steerForce.clone().add(seperationForce);
    this.applyForce(netForce);
    this.velocityVector.normalize().scale(this.speed * delta);
    const newPosition = this.getSceneItem()!
      .pos.clone()
      .add(this.getVelocityVector());

    const soldierRadius = this.radius;
    this.setPosition(
      helper.clampVector(
        newPosition,
        new SAT.Vector(soldierRadius, soldierRadius),
        stateManager.scene
          .getDimension()
          .clone()
          .sub(new SAT.Vector(soldierRadius, soldierRadius))
      )
    );
  }
}
