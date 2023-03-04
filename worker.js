const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cluster = require("cluster");
const PacketType = require("./common/PacketType");
const Packet = require("./gameserver/lib/Packet");
const PacketActions = require("./gameserver/PacketActions");
const GameStateManager = require("./gameserver/lib/GameStateManager");
const nbLoop = require("./common/nonBlockingLoop");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const SessionManager = {};
const MAX_MS_PER_TICK = 1000 / process.env.TICKRATE;
function serverTick(gameState, io) {
  //tick start time
  var startTime = Date.now();
  var timeUtilised = 0;

  // get client inputs from queue, update relevant game-state.
  var loop = () => {
    var updatePacket = gameState.getClientRequest();
    if (updatePacket) updatePacket.updateStateManager(gameState);
    timeUtilised = Date.now() - startTime;
    return true;
  };

  var test = () => {
    return timeUtilised < MAX_MS_PER_TICK && io.sockets.size > 0;
  };

  var onEnd = () => {
    //send updates to clients.
    gameState.broadcastUpdates();
    gameState.simulate();
    const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);
    //run server loop only if connections exist
    if (io.sockets.size > 0) {
      setTimeout(() => {
        serverTick(gameState, io);
      }, newTickAfterMS);
    }
  };
  nbLoop(test, loop, onEnd);
}

process.on("message", (message) => {
  //new session create
  if (message.type === "SESSION_INIT") {
    console.log("Worker Received Session Init", message);
    SessionManager[message.sessionId] = {
      sessionId: message.sessionId,
      gameState: new GameStateManager(
        io.of(`/${message.sessionId}`),
        require("./gameserver/stateMachines/server-state-machine/ServerStateMachine.json"),
        require("./gameserver/stateMachines/server-state-machine/ServerStateBehaviour")
      ),
    };
    //whenever a client is connected to namespace/session
    io.of(`/${message.sessionId}`).on("connection", (socket) => {
      console.log(
        `[#${message.sessionId}-Clients Connected]`,
        io.of(`/${message.sessionId}`).sockets.size
      );
      
      const gameState = SessionManager[message.sessionId].gameState;

      process.send({
        type: "SESSION_AVAILABILITY_UPDATE",
        sessionId: message.sessionId,
        gameStarted: gameState.GameStarted
      });

      // send update to master process whenever game starts, so it marks session as unavailable/busy.
      gameState.onGameStart(()=>{
        process.send({
          type: "SESSION_AVAILABILITY_UPDATE",
          sessionId: message.sessionId,
          gameStarted: gameState.GameStarted
        });
      });

      gameState.onGameEnd(() => {
        process.send({
          type: "SESSION_DESTROYED",
          sessionId: message.sessionId,
          workerId: message.workerId
        });
      });

      //if is the first client connection,
      if (io.of(`/${message.sessionId}`).sockets.size === 1) {
        setImmediate(() => {
          serverTick(
            SessionManager[message.sessionId].gameState,
            io.of(`/${message.sessionId}`)
          );
        });
      }
      Packet.io = io.of(`/${message.sessionId}`);

      socket.on("disconnect", (reason) => {
        console.log(
          "***clients disconnected, Remaining Active Connections : ",
          io.of(`/${message.sessionId}`).sockets.size
        );
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByServer.PLAYER_LEFT,
            socket,
            {},
            PacketActions.PlayerLeftPacketAction
          )
        );
      });

      // client requests init packet
      socket.on(PacketType.ByClient.CLIENT_INIT_REQUESTED, (data) => {
        //Initial packets
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByServer.PLAYER_INIT,
            socket,
            {},
            PacketActions.PlayerInitPacketAction,
            ["SessionLobbyState"]
          )
        );
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.PLAYER_JOINED,
            socket,
            {},
            PacketActions.PlayerJoinedPacketAction,
            ["SessionLobbyState"]
          )
        );
      });

      //client marked ready
      socket.on(PacketType.ByClient.PLAYER_READY, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.PLAYER_READY,
            socket,
            data,
            PacketActions.PlayerReadyPacketAction,
            ["SessionLobbyState"]
          )
        );
      });

      //client is not ready
      socket.on(PacketType.ByClient.PLAYER_UNREADY, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.PLAYER_UNREADY,
            socket,
            data,
            PacketActions.PlayerUnreadyPacketAction,
            ["SessionLobbyState"]
          )
        );
      });

      //Client Requesting to move a soldier
      socket.on(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SOLDIER_MOVE_REQUESTED,
            socket,
            data,
            PacketActions.SoldierMoveRequestedPacketAction,
            ["BattleState"]
          )
        );
      });

      //Client requesting a new soldier
      socket.on(PacketType.ByClient.SOLDIER_CREATE_REQUESTED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
            socket,
            data,
            PacketActions.SoldierCreateRequestedPacketAction,
            ["BattleState"]
          )
        );
      });

      //Client requested a new soldier spawn
      socket.on(PacketType.ByClient.SOLDIER_SPAWN_REQUESTED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SOLDIER_SPAWN_REQUESTED,
            socket,
            data,
            PacketActions.SoldierSpawnRequestedPacketAction,
            ["BattleState"]
          )
        );
      });

      //Client deleted their soldier
      socket.on(PacketType.ByClient.SOLDIER_DELETED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SOLDIER_DELETED,
            socket,
            data,
            PacketActions.SoldierDeletedPacketAction,
            ["BattleState"]
          )
        );
      });

      //Client Requesting Attack on other.
      socket.on(PacketType.ByClient.SOLDIER_ATTACK_REQUESTED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SOLDIER_ATTACK_REQUESTED,
            socket,
            data,
            PacketActions.AttackRequestedPacketAction,
            ["BattleState"]
          )
        );
      });

      //Client sent a chat message
      socket.on(PacketType.ByClient.CLIENT_SENT_CHAT, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.CLIENT_SENT_CHAT,
            socket,
            data,
            PacketActions.ChatMessagePacketAction
          )
        );
      });

      //Client selected a spawnpoint
      socket.on(PacketType.ByClient.SPAWN_POINT_REQUESTED, (data) => {
        gameState.queueClientRequest(
          new Packet(
            PacketType.ByClient.SPAWN_POINT_REQUESTED,
            socket,
            data,
            PacketActions.SpawnPointRequestedAction,
            ["SpawnSelectionState"]
          )
        );
      });
    });

    let trySendAck = () => {
      console.log('attempting to send ack for sessionId ', message.sessionId);
      if(server.listening)
        process.send({
          type: "SESSION_CREATED",
          sessionId: message.sessionId
        });
      else setTimeout(trySendAck,0);
    };
    trySendAck();
  }
});

server.listen(0, () => {
  console.log(
    `[Worker${cluster.worker.id}] Online @ port ${server.address().port}`
  );
});
