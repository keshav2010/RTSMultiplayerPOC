import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { SoldierState } from "./SoldierState";
import { nanoid } from "nanoid";
import { SoldierType, SoldierTypeConfig } from "../../common/SoldierType";
import { GameStateManager } from "../core/GameStateManager";

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

export class PlayerState extends Schema {
  @type("string") id: string;

  @type("string") name: string = "";
  @type("number") resources: number = 10;
  @type("boolean") readyStatus: boolean = false;

  @type("number") posX: number = 0;
  @type("number") posY: number = 0;

  @type("number") spawnFlagHealth: number = 100;

  // key: SoldierId
  @type({ map: SoldierState }) soldiers: MapSchema<SoldierState> =
    new MapSchema<SoldierState>();

  // RGB color identifier for this player/client.
  @type("number") colorR = Math.random() * 255;
  @type("number") colorG = Math.random() * 255;
  @type("number") colorB = Math.random() * 255;

  // Spawn Requests (key: requestId , val: obj {unitType, count, countdown})
  @type({ map: SpawnRequest }) spawnRequestDetailMap: MapSchema<SpawnRequest> =
    new MapSchema<SpawnRequest>();

  @type(["string"]) spawnRequestQueue: ArraySchema<string> =
    new ArraySchema<string>();

  // non-synced info
  resourceGrowthRateHz = 1;
  maxResources = 200;

  constructor(name: string, x: number, y: number, sessionId : string) {
    super();
    this.id = sessionId;
    this.name = name;
    this.resources = 100;
    this.readyStatus = false;
    this.posX = x;
    this.posY = y;
    this.spawnFlagHealth = 100;
    this.soldiers = new MapSchema<SoldierState>();
    this.spawnRequestDetailMap = new MapSchema<SpawnRequest>();
    this.spawnRequestQueue = new ArraySchema<string>();
  }

  private processSpawnRequest(deltaTime: number) {
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

    const soldierId = nanoid();

    console.log('spawning a soldier ', requestInfo.unitType);
    const newSoldier = new SoldierState(
      this.id,
      requestInfo.unitType,
      this.posX,
      this.posY
    );
    this.soldiers.set(soldierId, newSoldier);
  }

  public tick(deltaTime: number, gameStateManager: GameStateManager<SoldierState>) {
    this.resources += this.resourceGrowthRateHz * deltaTime;
    this.processSpawnRequest(deltaTime);

    //TODO: tick each soldier
    this.soldiers.forEach((soldier) => {
      soldier.tick(deltaTime, gameStateManager);
    });
  }

  public updatePosition(x: number, y: number) {
    this.posX = x;
    this.posY = y;
  }

  //TODO:
  public getAlliesId() {
    return [];
  }

  public getSoldier(soldierId: string) {
    const soldierState = this.soldiers.get(soldierId);
    return soldierState;
  }

  public getAllSoldiers() {
    return this.soldiers;
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

  public removeSoldier(soldierId: string) {
    this.soldiers.delete(soldierId);
  }

  public removeAllSoldiers() {
    this.soldiers.clear();
  }
}
