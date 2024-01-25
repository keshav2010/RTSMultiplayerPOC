import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { nanoid } from "nanoid";

export class SessionState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") sessionState:
    | "SESSION_LOBBY_STATE"
    | "SPAWN_SELECTION_STATE"
    | "BATTLE_STATE"
    | "BATTLE_END_STATE" = "SESSION_LOBBY_STATE";
  @type('number') countdown: number=10;
  constructor() {
    super();
  }

  public addPlayer(
    sessionId: string,
    name: string = nanoid(),
    x: number,
    y: number
  ) {
    this.players.set(sessionId, new PlayerState(`Player_${name}`, x, y));
  }

  public removePlayer(sessionId:string) {
    this.players.delete(sessionId);
  }
}
