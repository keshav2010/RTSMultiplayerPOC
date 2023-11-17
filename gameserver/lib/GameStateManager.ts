import { Queue } from "../../common/Queue";
import { Player } from "../Player";
import ServerLocalEvents from "../ServerLocalEvents";
import { AllianceTracker } from "./AllianceTracker";
import { Packet } from "./Packet";
import { Scene } from "./Scene";
import { StateMachine } from "./StateMachine";
import { PacketType } from "../../common/PacketType";
const EventEmitter = require("events");
/**
 * Manages entire game state.
 */
export class GameStateManager {
  cumulativeUpdates: any[];
  pendingClientRequests: Queue<Packet>;
  io: any;
  GameStarted: boolean;
  SocketToPlayerMap: Map<string, Player>;
  SocketsMap: Map<string, any>;
  lastSimulateTime_ms: number;
  event: any;
  scene: Scene;
  countdown: number;
  stateMachine: StateMachine;
  alliances: AllianceTracker;
  onGameStartCallback: (() => void) | null | undefined;
  onGameEndCallback: (() => void) | null | undefined;
  sessionId: string | null;
  constructor(
    io: any,
    sessionStateMachineJSON: any,
    sessionStateMachineActions: any
  ) {
    this.sessionId = null;
    this.cumulativeUpdates = [];
    this.pendingClientRequests = new Queue();

    this.io = io;

    this.GameStarted = false;
    this.SocketToPlayerMap = new Map();
    this.SocketsMap = new Map();
    this.lastSimulateTime_ms = Date.now();

    this.event = new EventEmitter();
    this.scene = new Scene(this);

    this.countdown = Number(process.env.COUNTDOWN) || 10; //seconds
    this.stateMachine = new StateMachine(
      sessionStateMachineJSON,
      sessionStateMachineActions
    );
    this.alliances = new AllianceTracker();
  }

  startGame() {
    this.GameStarted = true;
    if (this.onGameStartCallback) this.onGameStartCallback();
    // we'd like to call this only once.
    this.onGameStartCallback = null;
  }

  queueClientRequest(clientRequest: Packet) {
    this.pendingClientRequests.enqueue(clientRequest);
  }
  getClientRequest() {
    let request = this.pendingClientRequests.peekFront();
    this.pendingClientRequests.dequeue();
    return request;
  }

  enqueueStateUpdate(packet: { type: string; [key: string]: any }) {
    this.cumulativeUpdates.push(packet);
  }

  broadcastUpdates() {
    //removes socket property from packet.
    function cleanPacket(packet: { [x: string]: any; socket: any }) {
      const { socket, ...cleanPacket } = packet;
      return cleanPacket;
    }

    let batches: any[] = [];
    for (const packet of this.cumulativeUpdates) {
      let isBroadcastPacket = !packet.hasOwnProperty("socket");
      if (isBroadcastPacket) {
        if (
          !batches.length ||
          !batches[batches.length - 1][0]?.hasOwnProperty("socket")
        ) {
          batches.push({ packets: [cleanPacket(packet)] });
        } else {
          batches[batches.length - 1].packets.push(cleanPacket(packet));
        }
        continue;
      }

      const lastBatch = batches[batches.length - 1];
      if (lastBatch && lastBatch?.socket?.id === packet.socket.id) {
        lastBatch.packets.push(cleanPacket(packet));
        continue;
      }
      batches.push({ socket: packet.socket, packets: [cleanPacket(packet)] });
    }

    for (const batch of batches) {
      let isBroadcastPackets = !batch.hasOwnProperty("socket");
      if (isBroadcastPackets) {
        this.io.emit("tick", JSON.stringify({ data: batch.packets }));
      } else {
        batch.socket.emit("tick", JSON.stringify({ data: batch.packets }));
      }
    }
    this.cumulativeUpdates = [];
  }

  simulate() {
    this.stateMachine.tick({ gameStateManager: this });
  }

  registerPlayer(socket: any, player: Player) {
    console.log("registering player : ", player.id);
    if (!this.SocketToPlayerMap.has(socket.id))
      this.SocketToPlayerMap.set(socket.id, player);
    if (!this.SocketsMap.has(player.id)) this.SocketsMap.set(player.id, socket);
  }

  getPlayer(socketId: any) {
    return this.SocketToPlayerMap.get(socketId) || null;
  }
  getPlayers() {
    return [...this.SocketToPlayerMap.values()];
  }
  isPlayerRegistered(socket: { id: any }, player: { id: any }) {
    return (
      player?.id &&
      socket?.id &&
      this.SocketToPlayerMap.has(socket.id) &&
      this.SocketsMap.has(player?.id)
    );
  }

  getPlayerSocket(playerId: any) {
    return this.SocketsMap.get(playerId);
  }
  getPlayerById(playerId: any) {
    let socketId = this.SocketsMap.get(playerId)?.id;
    return this.SocketToPlayerMap.get(socketId) || null;
  }
  removePlayer(socketId: any) {
    //update for collision detection.
    this.scene.update();
    const player = this.SocketToPlayerMap.get(socketId);
    this.SocketToPlayerMap.delete(socketId);
    if (player) this.SocketsMap.delete(player.id);
  }

  createSoldier(x: number, y: number, type: any, playerId: string) {
    let player = this.getPlayerById(playerId);
    if (!player) {
      return null;
    }
    let { status, soldierId, soldier } = player.createSoldier(type, x, y);
    if (status) {
      this.scene.insertSoldier(soldier);
      this.event.emit(ServerLocalEvents.SOLDIER_CREATED, {
        x,
        y,
        type,
        playerId,
        soldierId,
      });
    }
    return { status, soldierId, soldier };
  }
  removeSoldier(playerId: string, soldierId: string) {
    let socketId = this.SocketsMap.get(playerId).id as string;
    const player = this.SocketToPlayerMap.get(socketId);
    if (!player) return true;
    let isRemoved = player.removeSoldier(soldierId, this);
    return isRemoved;
  }

  setAlliance(playerAId: any, playerBId: any, allianceType: any) {
    this.alliances.setAlliance(playerAId, playerBId, allianceType);
  }
  getAlliance(playerAId: any, playerBId: any) {
    return this.alliances.getAlliance(playerAId, playerBId);
  }
  OnGameStart(callback: (...arg: any) => void) {
    this.onGameStartCallback = callback || null;
  }
  OnGameEnd(callback: (...arg: any) => void) {
    this.onGameEndCallback = callback || null;
  }
  destroySession() {
    if (this.onGameEndCallback) {
      console.log(
        "Destroying Session | Invoking onGameEndCallback ",
        this.sessionId
      );
      this.onGameEndCallback();
    }
  }
}
