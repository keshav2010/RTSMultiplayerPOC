import { Schema, type } from "@colyseus/schema";
import { nanoid } from "nanoid";
import { SoldierType } from "../../common/SoldierType";

export interface ISoldier {
  currentPositionX: number;
  currentPositionY: number;

  expectedPositionX: number;
  expectedPositionY: number;

  type: SoldierType;
  width: number;
  height: number;

  health: number;
  speed: number;
  damage: number;
  cost: number;

  id: string;
  playerId: string;
}

export class SoldierState extends Schema implements ISoldier {
  @type("number") currentPositionX: number = 0;
  @type("number") currentPositionY: number = 0;
  @type("number") expectedPositionX: number = 0;
  @type("number") expectedPositionY: number = 0;
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
  @type("string") currentState:
    | "IDLE"
    | "MOVE"
    | "ATTACK"
    | "FINDTARGET"
    | "DEFEND"
    | "CHASETARGET" = "IDLE";

  constructor(
    playerId: string,
    soldierType: SoldierType,
    x: number,
    y: number
  ) {
    super();
    this.currentPositionX = x;
    this.currentPositionY = y;
    this.expectedPositionX = x;
    this.expectedPositionY = y;
    this.type = soldierType;
    this.health = 100;
    this.speed = 10;
    this.damage = 1;
    this.cost = 10;
    this.id = nanoid();
    this.playerId = playerId;
    this.currentState = "IDLE";
  }
}
