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
import { VectorState } from "./VectorState";
import { SessionState } from "./SessionState";
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
  @type(VectorState) currentPosition: VectorState = new VectorState();

  // pos possible for agent. (fallback for targetPosition)
  @type(VectorState) expectedPosition: VectorState = new VectorState();

  // pos requested by client.
  @type(VectorState) targetPosition: VectorState = new VectorState();

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

    const v = new SAT.Vector(x, y);
    this.currentPosition.setVector(v);
    this.expectedPosition.setVector(v);
    this.targetPosition.setVector(v);

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
    return this.expectedPosition.getVector();
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
    this.currentPosition.setVector(vec);
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
    this.targetPosition.setVector(vec);
    this.expectedPosition.setVector(vec);
    this.hasReachedDestination();
    this.attackTarget = null;
    this.steeringVector.scale(0);
    this.velocityVector.scale(0);
    this.stateMachine.controller.send("Move");
  }
  setExpectedPosition(vec: SAT.Vector) {
    this.expectedPosition.setVector(vec);
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

  tick(
    delta: number,
    stateManager: GameStateManagerType,
    sessionState: SessionState
  ) {
    this.currentState = this.stateMachine
      .currentState as keyof typeof SoldierStateMachineJSON.states;

    const centerPos = this.currentPosition
      .getVector()
      .add(new SAT.Vector(16, 16));

    const tileCoord = new SAT.Vector(
      Math.floor(centerPos.x / sessionState.tilemap.tilewidth),
      Math.floor(centerPos.y / sessionState.tilemap.tileheight)
    );

    const tileIndex =
      tileCoord.x + tileCoord.y * sessionState.tilemap.tilemapWidth;

    const currentTile = sessionState.tilemap.getTileTypeAt(tileIndex);

    if (currentTile === "water") {
      this.speed = SoldierTypeConfig[this.type].speed * 0.4;
    } else if (currentTile === "dirt") {
      this.speed = SoldierTypeConfig[this.type].speed * 0.7;
    } else this.speed = SoldierTypeConfig[this.type].speed;

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
            soldierA.currentPosition.x - res.overlapV.x,
            soldierA.currentPosition.y - res.overlapV.y
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

    const enemyCastles = stateManager.scene
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

    enemyCastles.forEach((enemyTower) => {
      if (!enemyTower) return;
      enemyTower.castleHealth = Math.max(
        0,
        enemyTower.castleHealth - 0.5 * delta
      );
      if (enemyTower.castleHealth <= 0)
        sessionState.removePlayer(enemyTower.id, stateManager);
    });

    let nearbyCaptureFlags = stateManager.scene.getNearbyUnits(
      soldierCenterPosition.x,
      soldierCenterPosition.y,
      100,
      ["CAPTURE_FLAG"]
    );

    const enemyCaptureFlags = nearbyCaptureFlags.filter(
      (quadtreeItem) =>
        sessionState.captureFlagIdToParentId.get(quadtreeItem.id) !==
        this.playerId
    );

    enemyCaptureFlags.forEach((flagQuatree) => {
      const flagOwnerId = sessionState.captureFlagIdToParentId.get(
        flagQuatree.id
      );
      if (!flagOwnerId) return;

      const flagOwner = sessionState.getPlayer(flagOwnerId);
      if (!flagOwner) return;

      const [flag] = sessionState
        .getPlayer(flagOwnerId)!
        .captureFlags.toArray()
        .filter((flag) => flag.id === flagQuatree.id);

      if (!flag) return;

      flag.setHealth(flag.health - 0.5 * delta);
      if (flag.health > 0) return;
      flagOwner.removeCaptureFlag(flag.id, sessionState, stateManager);
      sessionState.tilemap.updateOwnershipMap(sessionState.getPlayers());
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
