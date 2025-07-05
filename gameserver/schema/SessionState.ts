import { Schema, MapSchema, type } from "@colyseus/schema";
import { GameStateManagerType, PlayerState } from "./PlayerState";
import { nanoid } from "nanoid";
import { SERVER_CONFIG } from "../config";
import { TilemapState } from "./TilemapState";

export interface SessionOptions {
  minPlayers: number;
  maxPlayers: number;
  spawnSelectionTimer: number;
  lobbyWaitTmer: number;
  sessionName: string;
}
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
  @type(TilemapState) tilemap = new TilemapState();

  captureFlagIdToParentId: Map<string, string> = new Map<string, string>();
  @type("number") minPlayers: number;
  @type("number") maxPlayers: number;
  @type("string") sessionName: string;
  constructor(sessionOpts : SessionOptions) {
    super();
    this.sessionName = sessionOpts.sessionName;
    this.countdown = sessionOpts.spawnSelectionTimer;
    this.minPlayers = sessionOpts.minPlayers || SERVER_CONFIG.MINIMUM_PLAYERS_PER_SESSION;
    this.maxPlayers = sessionOpts.maxPlayers;
  }

  public addPlayer(
    sessionId: string,
    name: string = nanoid(),
    x: number,
    y: number
  ) {
    this.players.set(sessionId, new PlayerState(`${name}`, x, y, sessionId));
    return this.players.get(sessionId);
  }
  public getPlayer(sessionId: string) {
    return this.players.get(sessionId);
  }
  public getPlayers() {
    return this.players;
  }

  onCaptureFlagAdded(flagId: string, parentId: string) {
    this.captureFlagIdToParentId.set(flagId, parentId);
  }
  onCaptureFlagRemoved(flagId: string) {
    this.captureFlagIdToParentId.delete(flagId);
  }

  public removePlayer(sessionId: string, gameManager: GameStateManagerType) {
    const player = this.players.get(sessionId);
    if (!player) {
      return;
    }

    player.removeAllSoldiers(gameManager);
    player.captureFlags.forEach((flag) => {
      player.removeCaptureFlag(flag.id, this, gameManager);
    });
    player.captureFlags.clear();

    this.players.delete(sessionId);
    this.tilemap.updateOwnershipMap(this.getPlayers());
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
