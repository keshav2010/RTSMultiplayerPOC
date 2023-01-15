const PacketType = require("../../common/PacketType");
const Player = require("../Player");
const EventEmitter = require("events");
const ServerLocalEvents = require("../ServerLocalEvents");
const Scene = require("./Scene");
const StateMachine = require("./StateMachine");
const PendingUpdateManager = require("./PendingUpdateManager");
const { AllianceTracker } = require("./AllianceTracker");
/**
 * Manages entire game state.
 */
class GameStateManager {
  constructor(io, serverStateMachineJSON, serverStateMachineBehaviour) {
    this.clientInitUpdates = [];

    //all delta changes that we can send to client by serializing them or as a string whatever.
    this.cumulativeUpdates = [];

    this.io = io;

    this.GameStarted = false;
    this.SocketToPlayerData = new Map();
    this.ReadyPlayers = new Map();
    this.lastSimulateTime_ms = Date.now();
    
    this.event = new EventEmitter();
    this.scene = new Scene(this);

    this.countdown = process.env.COUNTDOWN; //seconds
    this.stateMachine = new StateMachine(serverStateMachineJSON, serverStateMachineBehaviour);
    this.pendingUpdates = new PendingUpdateManager();

    this.alliances = new AllianceTracker();
  }

  /**
   * broadcast updates to all clients.
   * reset cumulativeUpdates container.
   */
  broadcastCumulativeUpdate() {
    //broadcast changes to everyone
    this.io.emit("tick", JSON.stringify({ data: this.cumulativeUpdates }));

    //reset
    this.cumulativeUpdates = [];
  }

  /**
   * This function is expected to execute only once per client.
   */
  broadcastClientInitUpdate() {
    try {
      this.clientInitUpdates.forEach((deltaPacket) => {
        //copy all other parameters except socket field
        let filtered = Object.keys(deltaPacket)
          .filter((key) => key !== "socket")
          .reduce((obj, key) => {
            obj[key] = deltaPacket[key];
            return obj;
          }, {});

        deltaPacket.socket.emit(
          "tick",
          JSON.stringify({
            data: [filtered],
          })
        );
      });
      this.clientInitUpdates = [];
    } catch (err) {
      console.log(err);
    }
  }

  broadcastUpdates() {
    this.broadcastClientInitUpdate();
    this.broadcastCumulativeUpdate();
  }

  simulate() {
    this.stateMachine.tick({gameStateManager: this});
  }

  createPlayer(id) {
    if (!this.SocketToPlayerData.has(id))
      this.SocketToPlayerData.set(id, new Player(id, null, this));
  }

  removePlayer(id) {
    this.event.emit(ServerLocalEvents.SOLDIER_REMOVED, "test");
  }

  createSoldier(x, y, type, playerId) {
    let player = this.SocketToPlayerData.get(playerId);

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
    try {
      this.SocketToPlayerData.get(playerId).removeSoldier(soldierId, this);

      const deltaUpdate = {
        type: PacketType.ByServer.SOLDIER_KILLED,
        playerId: playerId,
        soldierId: soldierId,
      };
      stateManager.cumulativeUpdates.push(deltaUpdate);
    } catch (err) {}
  }

  setAlliance(playerAId, playerBId, allianceType) {
    this.alliances.setAlliance(playerAId, playerBId, allianceType);
  }
  getAlliance(playerAId, playerBId) {
    return this.alliances.getAlliance(playerAId, playerBId);
  }
}

module.exports = GameStateManager;
