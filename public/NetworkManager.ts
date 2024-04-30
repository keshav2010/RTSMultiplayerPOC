import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { SessionState } from "../gameserver/schema/SessionState";
import { PacketType } from "../common/PacketType";
const URL = `${window.location.host}`;
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
    const protocol = window.location.protocol.includes('http') ?  'ws' : 'wss';
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
    this.room.onStateChange.once((state) => {
      console.log("init state change", state);
    });
    this.room.onMessage("*", (type, message) => {
      if (type === PacketType.ByServer.NEW_CHAT_MESSAGE) {
        this.game.scene.getScenes(true).forEach((scene) => {
          scene.events.emit(type, message);
        });
      }
    });
    this.room.onLeave((code) => {
      console.log(`Leaving Room ${this.room?.name}, code: ${code}`);
      this.room = null;
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

  async disconnectGameServer() {
    try {
      await this.room?.leave();
    } catch (error) {
      console.log(`disconnect failed`);
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
      console.log(err);
    }
  }
}
