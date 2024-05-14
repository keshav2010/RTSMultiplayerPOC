import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { SessionState } from "../gameserver/schema/SessionState";
import { ITiled2DMap } from '../common/ITiled2DMap';

const URL = `${window.location.host}`;
import axios from 'axios';
export type RoomEventHandlerCallbackType = (
  type: "onStateChange" | "onMessage" | "onLeave" | "onError",
  data: any
) => void;
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

  constructor(
    phaserGame: Phaser.Game,
    phaserRegistry: Phaser.Data.DataManager
  ) {
    console.log(window.location);
    const protocol = window.location.protocol.includes("https:") ? "wss" : "ws";
    this.client = new Colyseus.Client(`${protocol}://${URL}`);
    this.room = null;

    this.game = phaserGame;
    this.scene = phaserGame.scene;

    this.registry = phaserRegistry;

    this.playerName = null;
    this.eventHandlersBinded = false;
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
      throw new Error(`Map not found.`);
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
    return this.room != null;
  }

  async disconnectGameServer() {
    try {
      await this.room?.leave();
    } catch (error) {
      console.log(`disconnect failed`, error);
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
  async hostAndJoinSession(roomName: string) {
    try {
      console.log(`[hostSession] : room(${roomName}) host requested.`);
      await this.disconnectGameServer().catch((err) => {
        console.log(err);
      });

      console.log(
        `[hostSession] : Attempted to disconnect to any existing room, Now Creating new session.`
      );
      this.room = await this.client.create("session_room", {
        name: roomName,
        playerName: this.getPlayerName(),
      });
      console.log("session created successfully.", this.room.roomId);
      this.setupRoomListener();
    } catch (err) {
      console.log(`Error occurred during host and join session`, this.room);
      throw err;
    }
  }
}
