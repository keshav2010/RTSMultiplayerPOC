import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { SessionState } from "../gameserver/schema/SessionState";
import { ITiled2DMap } from '../common/ITiled2DMap';

const URL = `${window.document.location.host.replace(/:.*/, '')}`;
import axios from 'axios';
export type RoomEventHandlerCallbackType = (
  type: "onStateChange" | "onMessage" | "onLeave" | "onError",
  data: any
) => void;

export enum NetworkErrorCode {
  MAP_NOT_FOUND = "MAP_NOT_FOUND",
  ERROR_DURING_ROOM_DISCONNECT = "ERROR_DURING_ROOM_DISCONNECT",
  FAILED_TO_HOST_SESSION = "FAILED_TO_HOST_SESSION",

}
export class NetworkError extends Error {
  errorCode: NetworkErrorCode;
  constructor(errorCode: NetworkErrorCode, message: string) {
    super(message);
    this.errorCode = errorCode;
  }
}
export class NetworkManager {
  client: Colyseus.Client;
  room: Colyseus.Room<SessionState> | null;
  game: Phaser.Game;
  scene: Phaser.Scenes.SceneManager;
  registry: Phaser.Data.DataManager;
  playerName: string | null;
  eventHandlersBinded: boolean;

  // the JSON stringified data for scene map (tiled2D json format)
  private mapData: ITiled2DMap | null = null;
  private pingIntervalId: NodeJS.Timeout | undefined;
  lastPingTimestamp: number = 0;
  latency: number = 999;

  constructor(
    phaserGame: Phaser.Game,
    phaserRegistry: Phaser.Data.DataManager
  ) {
    const endpoint = `${location.protocol.replace("http", "ws")}//${URL}${location.port ? ':' + location.port : ''}`
    this.client = new Colyseus.Client(endpoint);
    this.room = null;

    this.game = phaserGame;
    this.scene = phaserGame.scene;

    this.registry = phaserRegistry;

    this.playerName = null;
    this.eventHandlersBinded = false;
  }

  // In your setupRoomListener() or after joining a room:
  startPing() {
    this.pingIntervalId = setInterval(() => {
      if (this.room) {
        this.lastPingTimestamp = Date.now();
        this.room.send("ping", { timestamp: this.lastPingTimestamp });
      }
    }, 500);
  }

  getState() {
    return this.room?.state;
  }
  getClientId() {
    return this.room?.sessionId;
  }
  setupRoomListener() {
    if (!this.room) {
      return;
    }

    this.room.onMessage("*", (type, message) => {
      if (typeof type === "string") {
        this.game.scene.getScenes(true).forEach((scene) => {
          scene.events.emit(type, message);
        });
      }
    });

    this.room.onLeave((code) => {
      console.log(`Leaving Room ${this.room?.name}, code: ${code}`);
      this.room = null;
      this.mapData = null;
    });

    this.room.onError((code, message) => {
      console.log("[room / onError] :", { code, message });
      // this.game.events.emit();
    });
  }

  convertTo2DArray(
    data: number[],
    width: number,
    height: number
  ): number[][] | null {
    if (width * height !== data.length) {
      return null;
    }
    const result: number[][] = [];
    let index = 0;
    for (let i = 0; i < height; i++) {
      const row = data.slice(index, index + width);
      result.push(row);
      index += width;
    }
    return result;
  }

  async fetchRoomMap() {
    try {
      const res = await axios({
        method: "GET",
        url: "/maps",
        params: {
          id: this.room!.state.mapId || "",
        },
      });
      if (res.status === 200 || res.status === 304) {
        this.mapData = res.data.data;
        return;
      }
      throw new NetworkError(NetworkErrorCode.MAP_NOT_FOUND, "Failed to find map.");
    } catch (error) {
      this.mapData = null;
      throw error;
    }
  }

  getMapData() {
    if (this.room) {
      return this.convertTo2DArray(
        this.room.state.tilemap.tilemap1D.toArray(),
        this.room.state.tilemap.tilemapWidth,
        this.room.state.tilemap.tilemapHeight
      );
    }
    return null;
  }

  async connectGameServer(roomId: string) {
    const room = await this.client.joinById<SessionState>(roomId, {
      playerName: this.getPlayerName(),
    });
    this.room = room;
    this.setupRoomListener();
    return room;
  }

  isSocketConnected() {
    return this.room != null && this.room.connection?.isOpen;
  }

  async disconnectGameServer() {
    try {
      this.pingIntervalId && clearInterval(this.pingIntervalId);
      await this.room?.leave();
    } catch (error) {
      throw new NetworkError(NetworkErrorCode.ERROR_DURING_ROOM_DISCONNECT, "Encountered error while trying to disconnect.");
    }
  }

  sendEventToServer<T = any>(eventType: string, data: T) {
    this.room?.send(eventType, data);
  }

  setPlayerName(name: string) {
    this.playerName = name.trim().replace(" ", "-");
  }
  getPlayerName() {
    this.playerName =
      this.playerName ||
      `RandomPlayer${Math.abs(Math.random() * 1000).toFixed()}`;
    return this.playerName;
  }
  async getAvailableSession(roomName?: string) {
    let rooms = await this.client.getAvailableRooms(roomName);
    return rooms;
  }
  async hostAndJoinSession(sessionName: string, roomOptions : {
    minPlayers: number,
    maxPlayers: number,
    spawnSelectionTimer: number
  }) {
    try {

      // disconnect from any existing server.
      await this.disconnectGameServer().catch(err => {
        console.log(err);
      });

      // ref newly launched room
      this.room = await this.client.create("session_room", {
        name: sessionName,
        playerName: this.getPlayerName(),
        minPlayers: roomOptions.minPlayers,
        maxPlayers: roomOptions.maxPlayers,
        spawnSelectionTimer: roomOptions.spawnSelectionTimer
      });
      
      this.setupRoomListener();
    } catch (err) {
      console.error(err);
      throw new NetworkError(
        NetworkErrorCode.FAILED_TO_HOST_SESSION,
        "Failed to host a new session"
      )
    }
  }
}
