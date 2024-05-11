import { Schema, MapSchema, type } from "@colyseus/schema";
import { GameStateManagerType, PlayerState } from "./PlayerState";
import { nanoid } from "nanoid";
import { SERVER_CONFIG } from "../config";

export class SessionState extends Schema {
  // Key : sessionId
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") sessionState:
    | "SESSION_LOBBY_STATE"
    | "SPAWN_SELECTION_STATE"
    | "BATTLE_STATE"
    | "BATTLE_END_STATE" = "SESSION_LOBBY_STATE";
  @type("number") countdown: number = SERVER_CONFIG.COUNTDOWN_DEFAULT;
  @type("string") mapId: string = "map1";

  constructor() {
    super();
  }

  public addPlayer(
    sessionId: string,
    name: string = nanoid(),
    x: number,
    y: number
  ) {
    this.players.set(
      sessionId,
      new PlayerState(`Player_${name}`, x, y, sessionId)
    );
    return this.players.get(sessionId);
  }
  public getPlayer(sessionId: string) {
    return this.players.get(sessionId);
  }
  public removePlayer(sessionId: string, gameManager: GameStateManagerType) {
    const player = this.players.get(sessionId);
    if (!player) {
      return;
    }

    player.removeAllSoldiers(gameManager);
    this.players.delete(sessionId);
  }
  public countReadyPlayers() {
    return [...this.players.values()].reduce((acc, curr) => {
      acc = acc + (curr.readyStatus && curr.isLoaded ? 1 : 0);
      return acc;
    }, 0);
  }

  public countLoadedPlayers() {
    return [...this.players.values()].reduce((acc, curr) => {
      acc = acc + (curr.isLoaded ? 1 : 0);
      return acc;
    }, 0);
  }
}
