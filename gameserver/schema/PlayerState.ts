import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { SoldierState } from "./SoldierState";
import { nanoid } from "nanoid";
import { SoldierType, SoldierTypeConfig } from "../../common/SoldierType";
import { GameStateManager } from "../core/GameStateManager";
import { Scene } from "../core/Scene";
import { SceneObject } from "../core/types/SceneObject";
import SAT from "sat";
import { ISceneItem } from "../core/types/ISceneItem";
import { VectorState } from "./VectorState";
import { SessionState } from "./SessionState";
import { CaptureFlagState } from "./CaptureFlagState";
export type GameStateManagerType = GameStateManager<PlayerState>;

export class SpawnRequest extends Schema {
  @type("string") requestId: string = "";
  @type("string") unitType: SoldierType = "SPEARMAN";
  @type("number") count: number = 1;
  @type("number") countdown: number = 10;
  constructor(requestId: string, soldierType: SoldierType, count: number = 1) {
    super();
    this.requestId = requestId;
    this.unitType = soldierType;
    this.count = count;
    this.countdown = 10;
  }
}

export class PlayerState extends Schema implements ISceneItem {
  @type("string") id: string;

  @type("string") name: string = "";
  @type("number") resources: number = 100;

  // whether player/client has received all static data (ex: map json)
  @type("boolean") isLoaded: boolean = false;

  @type("boolean") readyStatus: boolean = false;

  @type(VectorState) pos: VectorState = new VectorState();

  @type("number") castleHealth: number = 100;

  // key: SoldierId
  @type({ map: SoldierState }) soldiers: MapSchema<SoldierState> =
    new MapSchema<SoldierState>();

  // RGB color identifier for this player/client.
  @type(VectorState) color = new VectorState(
    Math.random() * 255,
    Math.random() * 255,
    Math.random() * 255
  );

  // Spawn Requests (key: requestId , val: obj {unitType, count, countdown})
  @type({ map: SpawnRequest }) spawnRequestDetailMap: MapSchema<SpawnRequest> =
    new MapSchema<SpawnRequest>();

  @type(["string"]) spawnRequestQueue: ArraySchema<string> =
    new ArraySchema<string>();

  @type([CaptureFlagState]) captureFlags = new ArraySchema<CaptureFlagState>();

  // non-synced info
  @type("number") resourceGrowthRateHz = 2;
  maxResources = 200;

  sceneItemRef!: SceneObject;

  constructor(name: string, x: number, y: number, sessionId: string) {
    super();
    this.id = sessionId;
    this.sceneItemRef = new SceneObject(sessionId, x, y, 64, "FIXED", false);
    this.name = name;
    this.resources = 100;
    this.readyStatus = false;
    this.pos = new VectorState();
    this.castleHealth = 100;
    this.soldiers = new MapSchema<SoldierState>();
    this.spawnRequestDetailMap = new MapSchema<SpawnRequest>();
    this.spawnRequestQueue = new ArraySchema<string>();
  }
  getSceneItem() {
    return this.sceneItemRef;
  }

  createCaptureFlag(x: number, y: number, sessionState: SessionState) {
    if (this.captureFlags.length >= 4) {
      return;
    }
    const captureFlag = new CaptureFlagState(x, y);
    this.captureFlags.push(captureFlag);
    sessionState.tilemap.updateOwnershipMap(sessionState.getPlayers());
  }

  removeCaptureFlag(flagId: string, sessionState: SessionState) {
    const flagObj = this.captureFlags.findIndex(
      (flag) => flag.flagId === flagId
    );
    if (flagObj < 0) {
      return;
    }
    this.captureFlags.deleteAt(flagObj);
    sessionState.tilemap.updateOwnershipMap(sessionState.getPlayers());
  }

  private processSpawnRequest(deltaTime: number, scene: Scene) {
    if (this.spawnRequestQueue.length < 1) return;
    const requestId = this.spawnRequestQueue.at(0);
    if (!requestId) return;

    const requestInfo = this.spawnRequestDetailMap.get(requestId);
    if (!requestInfo) return;

    const spawnCost = SoldierTypeConfig[requestInfo.unitType].cost;
    const isEnoughResources = this.resources > spawnCost;

    if (!isEnoughResources) return;

    requestInfo.countdown = requestInfo.countdown - deltaTime;
    if (requestInfo.countdown > 0) {
      return;
    }

    // spawn a unit, and clear queue entry.
    this.spawnRequestDetailMap.delete(requestId);
    this.spawnRequestQueue.shift();
    this.addNewSoldier(requestInfo.unitType, scene);
  }

  public addNewSoldier(type: SoldierType, scene: Scene) {
    const newSoldier = new SoldierState(
      this.id,
      type,
      this.pos.x + 16,
      this.pos.y + 16
    );
    this.soldiers.set(newSoldier.id, newSoldier);
    scene.addSceneItem(newSoldier);
    return newSoldier.id;
  }

  public tick(
    deltaTime: number,
    gameStateManager: GameStateManagerType,
    sessionState: SessionState
  ) {
    this.resources += this.resourceGrowthRateHz * deltaTime;
    this.processSpawnRequest(deltaTime, gameStateManager.scene);

    this.captureFlags.forEach((flagState) => flagState.tick(deltaTime));

    //TODO: tick each soldier
    this.soldiers.forEach((soldier) => {
      soldier.tick(deltaTime, gameStateManager, sessionState);
    });

    this.resourceGrowthRateHz = this.resourceGrowthRateHz - 0.1 * deltaTime;
    if (this.resourceGrowthRateHz < 0) this.resourceGrowthRateHz = 0.2;
  }

  public updatePosition(x: number, y: number) {
    const v = new SAT.Vector(x, y);
    this.pos.setVector(v);
    this.sceneItemRef.setPosition(v);
  }

  //TODO:
  public getAlliesId() {
    return [];
  }

  public getSoldier(soldierId?: string | null) {
    if (!soldierId) return;
    const soldierState = this.soldiers.get(soldierId);
    return soldierState;
  }

  public getAllSoldiers() {
    return Array.from(this.soldiers.values());
  }

  public queueSpawnRequest(soldierType: SoldierType) {
    const costOfUnit = SoldierTypeConfig[soldierType].cost;
    if (costOfUnit > this.resources) return;

    const requestId = nanoid();
    this.spawnRequestQueue.push(requestId);
    const request: SpawnRequest = new SpawnRequest(requestId, soldierType, 1);
    this.spawnRequestDetailMap.set(requestId, request);
    this.resources -= costOfUnit;
  }

  public removeSoldier(soldierId: string, gameManager: GameStateManagerType) {
    gameManager.scene.removeSceneItem(soldierId);
    this.soldiers.delete(soldierId);
  }

  public removeAllSoldiers(gameManager: GameStateManagerType) {
    this.soldiers.forEach((item) => {
      this.removeSoldier(item.id, gameManager);
    });
  }
}
