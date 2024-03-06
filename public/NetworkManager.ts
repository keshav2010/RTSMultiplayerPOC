import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { SessionState } from "../gameserver/schema/SessionState";
const URL = `${process.env.COLYSEUS_SERVER_URL}`;
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
  constructor(
    phaserGame: Phaser.Game,
    phaserRegistry: Phaser.Data.DataManager
  ) {
    this.client = new Colyseus.Client(`ws://${URL}` || `ws://localhost:2567`);
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
    this.room.onStateChange.once((state) => {
      console.log("init state change", state);
    });
    this.room.onMessage("*", (type, message) => {
      console.log("[room / onMessage] :", { type, message });
    });
    this.room.onLeave((code) => {
      this.disconnectGameServer();
    });
    this.room.onError((code, message) => {
      console.log("[room / onError] :", { code, message });
      // this.game.events.emit();
    });
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

  async disconnectPreviousSession() {
    if (!this.room) {
      return;
    }
    await this.room.leave();
    this.room.removeAllListeners();
    this.room = null;
  }

  async disconnectGameServer() {
    if (!this.room) {
      return;
    }
    await this.room.leave();
    this.room.removeAllListeners();
    this.room = null;
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
      if (this.room) {
        await this.disconnectGameServer();
      } else {
        console.log("[NetworkManager] No room connected, creating new one");
      }
      this.room = await this.client.create("session_room", {
        name: roomName,
        playerName: this.getPlayerName(),
      });

      console.log("created successfully.", this.room);
      this.setupRoomListener();
    } catch (err) {
      console.log(err);
    }
  }
}
