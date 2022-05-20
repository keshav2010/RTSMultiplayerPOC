const PacketType = require("../common/PacketType");
const Player = require("./Player");
const EventEmitter = require("events");
const ServerLocalEvents = require("./ServerLocalEvents");
const Scene = require("./Scene");
const nbLoop = require("../common/nonBlockingLoop");
const StateMachine = require("../common/StateMachine");
const PendingUpdateManager = require("./PendingUpdateManager");
const ServerStateMachineJSON = require("./stateMachines/ServerStateMachine.json");
/**
 * Manages entire game state.
 */
class GameStateManager {
  constructor(io) {
    this.clientInitUpdates = [];

    //all delta changes that we can send to client by serializing them or as a string whatever.
    this.cumulativeUpdates = [];

    this.io = io;

    this.GameStarted = false;
    this.SocketToPlayerData = new Map();
    this.ReadyPlayers = new Map();
    this.lastSimulateTime_ms = new Date().getTime();
    this.event = new EventEmitter();
    this.scene = new Scene(this);

    this.countdown = 0.2; //seconds
    this.stateMachine = new StateMachine(ServerStateMachineJSON);
    this.pendingUpdates = new PendingUpdateManager();
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

  simulate() {
    switch (this.stateMachine.currentState) {
      case "SpawnSelectionState":
        this.SpawnSelectionState();
        break;
      case "BattleState":
        this.BattleState();
        break;
      case "BattleEndState":
        this.BattleEndState();
        break;
    }
  }

  SpawnSelectionState() {
    try {
      //in seconds
      var deltaTime = (new Date().getTime() - this.lastSimulateTime_ms) / 1000;
      this.lastSimulateTime_ms = new Date().getTime();
      this.countdown -= deltaTime;
      this.countdown = Math.max(0, this.countdown);
      this.pendingUpdates.queueServerEvent({
        type: PacketType.ByServer.COUNTDOWN_TIME,
        time: this.countdown,
      });
      if (this.countdown <= 0) {
        console.log("countdown completed for spawn-selection");
        this.stateMachine.controller.send("TIMEOUT");
      }
    } catch (err) {
      console.log(err);
    }
  }

  BattleState() {
    try {
      var deltaTime = (new Date().getTime() - this.lastSimulateTime_ms) / 1000;
      this.lastSimulateTime_ms = new Date().getTime();
      let playerIdArray = [...this.SocketToPlayerData.keys()];
      var i = 0;
      var test = () => {
        return i < playerIdArray.length;
      };
      var loop = () => {
        let playerObject = this.SocketToPlayerData.get(playerIdArray[i++]);
        playerObject.tick(deltaTime, this.pendingUpdates, this);
        return true;
      };
      nbLoop(test, loop);
    } catch (err) {
      console.log(err);
    }
  }
  BattleEndState(updateManager) {}

  //creates a new player object
  createPlayer(id) {
    if (!this.SocketToPlayerData.has(id))
      this.SocketToPlayerData.set(id, new Player(id, null, this));
  }

  //remove player and all related soldiers.
  removePlayer(id) {
    this.event.emit(ServerLocalEvents.SOLDIER_REMOVED, "test");
  }

  //create soldier (type) for player
  createSoldier(x, y, type, playerId) {
    let player = this.SocketToPlayerData.get(playerId);

    //create soldier and insert into scene also (for collision detection)
    let { status, soldierId, soldier } = player.createSoldier(type, x, y);
    if (status) this.scene.insertSoldier(soldier);

    this.event.emit(ServerLocalEvents.SOLDIER_CREATED, {
      x,
      y,
      type,
      playerId,
      soldierId,
    });
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
}

module.exports = GameStateManager;
