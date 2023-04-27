const PacketType = require("../../common/PacketType");
const EventEmitter = require("events");
const ServerLocalEvents = require("../ServerLocalEvents");
const Scene = require("./Scene");
const StateMachine = require("./StateMachine");
const { AllianceTracker } = require("./AllianceTracker");
const { Queue } = require("../../common/Queue");
/**
 * Manages entire game state.
 */
class GameStateManager {
  constructor(io, sessionStateMachineJSON, sessionStateMachineActions) {
    this.cumulativeUpdates = [];
    this.pendingClientRequests = new Queue();

    this.io = io;

    this.GameStarted = false;
    this.SocketToPlayerMap = new Map();
    this.SocketsMap = new Map();
    this.lastSimulateTime_ms = Date.now();

    this.event = new EventEmitter();
    this.scene = new Scene(this);

    this.countdown = process.env.COUNTDOWN; //seconds
    this.stateMachine = new StateMachine(
      sessionStateMachineJSON,
      sessionStateMachineActions
    );
    this.alliances = new AllianceTracker();
  }

  startGame() {
    this.GameStarted = true;
    if(this.onGameStartCallback)
      this.onGameStartCallback();
    // we'd like to call this only once.
    this.onGameStartCallback = null;
  }

  queueClientRequest(clientRequest) {
    this.pendingClientRequests.enqueue(clientRequest);
  }
  getClientRequest() {
    let request = this.pendingClientRequests.peekFront();
    this.pendingClientRequests.dequeue();
    return request;
  }

  enqueueStateUpdate(packet) {
    this.cumulativeUpdates.push(packet);
  }

  broadcastUpdates() {
    //removes socket property from packet.
    function cleanPacket(packet) {
      const { socket, ...cleanPacket } = packet;
      return cleanPacket;
    }
    
    let batches = [];
    for (const packet of this.cumulativeUpdates) {
      let isBroadcastPacket = !packet.hasOwnProperty('socket');
      if (isBroadcastPacket) {
        if (!batches.length || !(batches[batches.length - 1][0]?.hasOwnProperty("socket"))) {
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
  
    for(const batch of batches) {
      let isBroadcastPackets = !batch.hasOwnProperty("socket");
      if(isBroadcastPackets) {
        this.io.emit("tick", JSON.stringify({ data: batch.packets }));
      } else {
        batch.socket.emit("tick", JSON.stringify({ data: batch.packets }));
      }
    }
    this.cumulativeUpdates = [];
  }

  simulate() {
    this.stateMachine.tick({gameStateManager: this});
  }

  registerPlayer(socket, player) {
    console.log("registering player : ", player.id);
    if(!this.SocketToPlayerMap.has(socket.id))
      this.SocketToPlayerMap.set(socket.id, player);
    if(!this.SocketsMap.has(player.id))
      this.SocketsMap.set(player.id, socket);
  }

  getPlayer(socketId) {
    return this.SocketToPlayerMap.get(socketId) || null;
  }
  getPlayers() {
    return [...this.SocketToPlayerMap.values()];
  }
  isPlayerRegistered(socket, player) {
    return player?.id && socket?.id && this.SocketToPlayerMap.has(socket.id) && this.SocketsMap.has(player?.id)
  }

  getPlayerSocket(playerId) {
    return this.SocketsMap.get(playerId);
  }
  getPlayerById(playerId) {
    let socketId = this.SocketsMap.get(playerId)?.id;
    return this.SocketToPlayerMap.get(socketId) || null;
  }
  removePlayer(socketId) {
        //update for collision detection.
        this.scene.update();
        const player = this.SocketToPlayerMap.get(socketId);
        this.SocketToPlayerMap.delete(socketId);
        this.SocketsMap.delete(player.id);
  }

  createSoldier(x, y, type, playerId) {
    let player = this.getPlayerById(playerId);
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
  removeSoldier(playerId, soldierId) {
      let socketId = this.SocketsMap.get(playerId).id;
      let isRemoved = this.SocketToPlayerMap.get(socketId).removeSoldier(soldierId, this);
      return isRemoved;
  }

  setAlliance(playerAId, playerBId, allianceType) {
    this.alliances.setAlliance(playerAId, playerBId, allianceType);
  }
  getAlliance(playerAId, playerBId) {
    return this.alliances.getAlliance(playerAId, playerBId);
  }
  OnGameStart(callback) {
    this.onGameStartCallback = callback || null;
  }
  OnGameEnd(callback) {
    this.onGameEndCallback = callback || null;
  }
  destroySession() {
    if(this.onGameEndCallback) {
      console.log("Destroying Session | Invoking onGameEndCallback ", this.sessionId);
      this.onGameEndCallback();
    }
  }
}

module.exports = GameStateManager;
