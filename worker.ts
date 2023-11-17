const http = require("http");
const express = require("express");
import { Namespace, Server } from "socket.io";
import cluster from "cluster";
import { PacketType } from "./common/PacketType";
import { Packet } from "./gameserver/lib/Packet";
import { ProcessMessage } from './interfaces/processMessage';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./interfaces/socket";
import { GameStateManager } from "./gameserver/lib/GameStateManager";
import ServerStateMachine from './gameserver/stateMachines/server-state-machine/SessionStateMachine.json';
import ServerStateMachineHandlers from './gameserver/stateMachines/server-state-machine/SessionStateBehaviour';
import PacketActions from "./gameserver/PacketActions";
import { nbLoop } from "./common/nonBlockingLoop";
const app = express();
const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

class SessionManager {
  sessions: {
    [key: string]: {
      sessionId: string;
      stateManager: GameStateManager;
    };
  };
  constructor() {
    this.sessions = {};
  }
  addSession(sid: string, gameStateManagerInstance: GameStateManager) {
    this.sessions[sid] = {
      sessionId: sid,
      stateManager: gameStateManagerInstance,
    };
  }
  getSessions(sid = null) {
    if (!sid) return Object.values(this.sessions);
    return [this.sessions[sid]] || null;
  }
  getStateManager(sid: string) {
    return this.sessions.hasOwnProperty(sid)
      ? this.sessions[sid].stateManager
      : null;
  }
  killSession(sid: string) {
    if (!this.sessions.hasOwnProperty(sid)) {
      console.warn(`Session ${sid} not found, unable to kill.`);
      return;
    }
    delete this.sessions[sid];
  }
}
const sessionManager = new SessionManager();
const MAX_MS_PER_TICK = 1000 / Number(process.env.TICKRATE || 20);
function serverTick(
  stateManager: GameStateManager,
  io: Namespace<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) {
  //tick start time
  var startTime = Date.now();
  var timeUtilised = 0;

  // get client inputs from queue, update relevant game-state.
  var loop = () => {
    var updatePacket = stateManager.getClientRequest();
    if (updatePacket) updatePacket.updateStateManager(stateManager);
    timeUtilised = Date.now() - startTime;
    return true;
  };

  var test = () => {
    return timeUtilised < MAX_MS_PER_TICK && io.sockets.size > 0;
  };

  var onEnd = () => {
    //send updates to clients.
    stateManager.broadcastUpdates();
    stateManager.simulate();
    const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);
    //run server loop only if connections exist
    if (io.sockets.size > 0) {
      setTimeout(() => {
        serverTick(stateManager, io);
      }, newTickAfterMS);
    }
  };
  nbLoop(test, loop, onEnd);
}

process.on("message", (message : ProcessMessage) => {
  console.log(`[worker${message.workerId}] received message : `, message);
  //new session create
  if (message.type === "SESSION_CREATE_REQUESTED") {
    sessionManager.addSession(
      message.sessionId,
      new GameStateManager(
        io.of(`/${message.sessionId}`),
        ServerStateMachine,
        ServerStateMachineHandlers
      )
    );
    //whenever a client is connected to namespace/session
    io.of(`/${message.sessionId}`).on("connection", (socket) => {
      console.log(
        `[#${message.sessionId}-Clients Connected]`,
        io.of(`/${message.sessionId}`).sockets.size
      );

      const stateManager = sessionManager.getStateManager(message.sessionId);
      if(!stateManager) {
        return;
      }
      stateManager.sessionId = message.sessionId;

      process.send!({
        type: "SESSION_UPDATED",
        sessionId: message.sessionId,
        gameStarted: stateManager!.GameStarted,
        players: stateManager!.getPlayers().length,
      } as unknown as ProcessMessage);

      // send update to master process whenever game starts, so it marks session as unavailable/busy.
      stateManager!.OnGameStart(() => {
        process.send!({
          type: "SESSION_UPDATED",
          sessionId: message.sessionId,
          gameStarted: stateManager!.GameStarted,
          players: stateManager!.getPlayers().length,
        } as unknown as ProcessMessage);
      });

      stateManager!.OnGameEnd(() => {
        console.log(
          `--- OnGameEnd : session ${stateManager!.sessionId} ended, signalling master (SESSION_DESTROYED)`
        );
        process.send!({
          type: "SESSION_DESTROYED",
          sessionId: stateManager!.sessionId,
          workerId: cluster.worker!.id,
        });

        // clear session from worker's entry.
        const before = sessionManager.getSessions().length;
        sessionManager.killSession(stateManager!.sessionId!);
        const after = sessionManager.getSessions().length;

        const sessionNamespace = io.of(`/${stateManager!.sessionId}`);
        console.log(
          `--- Clearing up namespace (disconnectSockets & removeAllListeners) [${before} earlier, -> ${after} sessions remaining]`
        );
        sessionNamespace.disconnectSockets();
        sessionNamespace.removeAllListeners();

        // check how many sessions are pending
        if (sessionManager.getSessions().length === 0) {
          cluster.worker!.disconnect();
        }
      });

      //if is the first client connection,
      if (io.of(`/${message.sessionId}`).sockets.size === 1) {
        setImmediate(() => {
          serverTick(
            sessionManager.getStateManager(message.sessionId)!,
            io.of(`/${message.sessionId}`)
          );
        });
      }
      Packet.io = io.of(`/${message.sessionId}`);

      socket.on("disconnect", (reason) => {
        const activeConnections = io.of(`/${message.sessionId}`).sockets.size;
        console.log(
          "***clients disconnected, Remaining Active Connections : ",
          activeConnections
        );
        stateManager.queueClientRequest(
          new Packet(
            PacketType.ByServer.PLAYER_LEFT,
            socket,
            {},
            PacketActions.PlayerLeftPacketAction
          )
        );

        // no active connection left, so destroy session
        if (activeConnections === 0) stateManager.destroySession();
      });

      // client requests init packet
      socket.on(PacketType.ByClient.CLIENT_INIT_REQUESTED, ({ playerName }) => {
        //Initial packets
        stateManager.queueClientRequest(
          new Packet(
            PacketType.ByServer.PLAYER_INIT,
            socket,
            { playerName },
            PacketActions.PlayerInitPacketAction,
            ["SessionLobbyState"]
          )
        );
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
        stateManager.queueClientRequest(
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
      // console.log('attempting to send ack for sessionId ', message.sessionId);
      if (server.listening)
        process.send!({
          type: "SESSION_CREATED_ACK",
          sessionId: message.sessionId,
          workerId: cluster!.worker!.id,
        } as unknown as ProcessMessage);
      else setTimeout(trySendAck, 0);
    };
    trySendAck();
  }
});

server.listen(3007, () => {
  console.log(`[Worker${cluster.worker!.id}] Online @ port ${server.address()}`);
});
