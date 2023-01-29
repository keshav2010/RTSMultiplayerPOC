require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const socketIO = require("socket.io");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const app = express();

const PacketType = require("./common/PacketType");
const Packet = require("./gameserver/lib/Packet");
const PacketActions = require("./gameserver/PacketActions");

const GameStateManager = require("./gameserver/lib/GameStateManager");
const cors = require("cors");

const nbLoop = require("./common/nonBlockingLoop");

app.use(cors());
app.use(express.static("dist"));
app.use(express.static("public"));

app.get("/", function (req, res) {
  const pathName = path.resolve(__dirname);
  fs.readdir(pathName, (err, files) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Internal Server Error, Try again later.");
    }

    var filename = files.find((file) => {
      return path.extname(file) === ".html";
    });
    if (filename == undefined) {
      return res.status(500).send(`<h1>ERROR! File not found at ${path}</h1>`);
    }
    var filepath = path.resolve(__dirname, "dist", filename);
    console.log("serving file", filepath);
    res.sendFile(filepath);
  });
});

let httpServer = app.listen(PORT, () => {
  console.log("Live @ ", PORT);
});

//Init support for Websocket
const io = socketIO(httpServer);

const MAX_MS_PER_TICK = 1000 / process.env.TICKRATE;
var gameState;

/**
 * Executed at frequency of TickRate
 */
function processPendingUpdates() {
  //tick start time
  var startTime = Date.now();
  var timeUtilised = 0;

  var loop = () => {
    var updatePacket = gameState.pendingUpdates.getClientRequest();
    if (updatePacket) updatePacket.updateStateManager(gameState);
    timeUtilised = Date.now() - startTime;
    return true;
  };
  var test = () => {
    return timeUtilised < MAX_MS_PER_TICK && io.of("/").sockets.size > 0;
  };
  var onEnd = () => {
    gameState.simulate();
    //Broadcast delta-changes to all connected clients
    gameState.broadcastUpdates();
    let serverEvent;
    while ((serverEvent = gameState.pendingUpdates.getServerEvent())) {
      if (serverEvent) io.emit("tick", JSON.stringify({ data: [serverEvent] }));
    }
    const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);
    //run server loop only if connections exist
    if (io.of("/").sockets.size > 0) {
      setTimeout(processPendingUpdates, newTickAfterMS);
    }
  };
  nbLoop(test, loop, onEnd);
}

//whenever a client is connected
io.on("connection", (socket) => {
  console.log("***clients connected : ", io.of("/").sockets.size);
  if (io.of("/").sockets.size === 1) {
    gameState = new GameStateManager(
      io,
      require("./gameserver/stateMachines/server-state-machine/ServerStateMachine.json"),
      require("./gameserver/stateMachines/server-state-machine/ServerStateBehaviour")
    );
    setImmediate(processPendingUpdates);
  }
  Packet.io = io;

  //Initial packets
  gameState.pendingUpdates.queueClientRequest(
    new Packet(
      PacketType.ByServer.PLAYER_INIT,
      socket,
      {},
      PacketActions.PlayerInitPacketAction,
      ["SpawnSelectionState"]
    )
  );
  gameState.pendingUpdates.queueClientRequest(
    new Packet(
      PacketType.ByClient.PLAYER_JOINED,
      socket,
      {},
      PacketActions.PlayerJoinedPacketAction,
      ["SpawnSelectionState"]
    )
  );

  socket.on("disconnect", (reason) => {
    console.log(
      "***clients disconnected, active atm : ",
      io.of("/").sockets.size
    );
    gameState.pendingUpdates.queueClientRequest(
      new Packet(
        PacketType.ByServer.PLAYER_LEFT,
        socket,
        {},
        PacketActions.PlayerLeftPacketAction
      )
    );
  });

  //client marked ready
  socket.on(PacketType.ByClient.PLAYER_READY, (data) => {
    gameState.pendingUpdates.queueClientRequest(
      new Packet(
        PacketType.ByClient.PLAYER_READY,
        socket,
        data,
        PacketActions.PlayerReadyPacketAction,
        ["SpawnSelectionState"]
      )
    );
  });

  //client is not ready
  socket.on(PacketType.ByClient.PLAYER_UNREADY, (data) => {
    gameState.pendingUpdates.queueClientRequest(
      new Packet(
        PacketType.ByClient.PLAYER_UNREADY,
        socket,
        data,
        PacketActions.PlayerUnreadyPacketAction,
        ["SpawnSelectionState"]
      )
    );
  });

  //Client Requesting to move a soldier
  socket.on(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, (data) => {
    gameState.pendingUpdates.queueClientRequest(
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
    gameState.pendingUpdates.queueClientRequest(
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
    gameState.pendingUpdates.queueClientRequest(
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
    gameState.pendingUpdates.queueClientRequest(
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
    gameState.pendingUpdates.queueClientRequest(
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
    gameState.pendingUpdates.queueClientRequest(
      new Packet(
        PacketType.ByClient.CLIENT_SENT_CHAT,
        socket,
        data,
        PacketActions.ChatMessagePacketAction
      )
    );
  });

  socket.on(PacketType.ByClient.SPAWN_POINT_REQUESTED, (data) => {
    gameState.pendingUpdates.queueClientRequest(
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
