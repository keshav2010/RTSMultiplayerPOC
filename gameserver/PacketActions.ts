/**
 * These Functions should only affect game state,
 * they must also populate DeltaUpdate arrays [cumulativeUpdates, etc].
 *
 * They must not do any sort of networking
 *
 * These functions should only update game state variables.
 */
import { PacketType } from "../common/PacketType";
import { GameStateManager } from "./core/GameStateManager";
import { nanoid } from "nanoid";

function PlayerInitPacketAction(
  packetType: any,
  stateManager: GameStateManager,
  { playerName }: { playerName: string }
) {
  try {
    const playerId = `pid${nanoid()}`;
    console.log(
      `[INIT_PACKET setup]-Player ${playerName} (${playerId}) Joined.`
    );
    let player = new Player(playerId, playerName);
    stateManager.registerClient(socket, player);

    //the main init packet, the "socket" property is added to ensure packet is only
    //delivered over this specified socket instead of broadcast to all clients.
    let players = stateManager.getPlayers();
    const deltaUpdate = {
      type: packetType,
      socket,
      playerId,
      players: players.map((player) => (player as Player).getSnapshot()),
    };

    //inform new player about existing units.
    players
      .filter((p) => p.id !== playerId)
      .forEach((opponent) => {
        const player = opponent as Player;
        if (player.SoldierMap.size < 1) return;
        [...player.SoldierMap.values()].forEach((s) => {
          let soldierSnapshot = s.getSnapshot();

          let initPacket = {
            type: PacketType.ByServer.SOLDIER_CREATE_ACK,
            isCreated: true,
            socket,
            soldier: soldierSnapshot, //detail of soldier
            playerId: soldierSnapshot.playerId, //person who created soldier
            soldierType: soldierSnapshot.type,
          };
        });
      });
  } catch (err) {
    console.log(err);
  }
}

function PlayerJoinedPacketAction(
  packetType: any,
  stateManager: GameStateManager
) {
  try {
    const player = stateManager.getClient(socket.id);
    if (!player) return;
    console.log(`Player ${player.id} Attempting to Join.`);
    if (stateManager.GameStarted) {
      console.log(`Game Started, Disconnecting player${player.id}`);
      socket.disconnect();
      return;
    }
    const deltaUpdate = {
      type: packetType,
      player: player.getSnapshot(),
    };
  } catch (err) {
    console.log(err);
  }
}

function PlayerReadyPacketAction(
  packetType: any,
  stateManager: GameStateManager
) {
  try {
    const player = stateManager.getClient(socket.id);
    if (!player) return null;
    console.log(`Player ${player.id} Marked ready.`);
    player.readyStatus = true;
    let readyPlayersCount = stateManager
      .getPlayers()
      .filter((p) => p.readyStatus).length;
    if (readyPlayersCount === stateManager.getPlayers().length) {
      stateManager.startGame();
    }
    const deltaUpdate = {
      type: packetType,
      playerId: player.id,
      startGame: stateManager.GameStarted,
    };
  } catch (err) {
    console.log(err);
  }
}

function PlayerUnreadyPacketAction(
  packetType: any,
  stateManager: GameStateManager
) {
  try {
    const player = stateManager.getClient(socket.id);
    if (!player) {
      return;
    }
    console.log(`Player ${player.id} Trying to mark itself Unready.`);
    let readyPlayersCount = stateManager
      .getPlayers()
      .filter((p) => p.readyStatus).length;
    if (
      stateManager.GameStarted ||
      readyPlayersCount === stateManager.getPlayers().length
    ) {
      if (!stateManager.GameStarted) stateManager.startGame();
      return;
    }
    player.readyStatus = false;
    const deltaUpdate = {
      type: packetType,
      playerId: player.id,
      startGame: stateManager.GameStarted,
    };
  } catch (err) {
    console.log(err);
  }
}

function PlayerLeftPacketAction(
  packetType: any,
  stateManager: GameStateManager
) {
  try {
    let player = stateManager.getClient(socket.id);
    if (!player) return;
    console.log(`Player ${player.id} Left/Disconnected.`);
    player?.destroy(stateManager);
    stateManager.removePlayer(socket.id);
    const deltaUpdate = {
      type: packetType,
      playerId: player.id,
    };
  } catch (err) {
    console.log(err);
  }
}

function PlayerLostPacketAction(
  packetType: any,
  stateManager: GameStateManager
) {
  try {
    let player = stateManager.getClient(socket.id);
    if (!player) return;
    console.log(`Player ${player.id} Lost.`);
    player?.destroy(stateManager);
    const deltaUpdate = {
      type: packetType,
      playerId: player.id,
    };
  } catch (err) {
    console.log(err);
  }
}

/**
 * data must be
 * {
 *  posX,
 *  posY,
 *  soldiers [] | 'a,b,c'
 * }
 */
function SoldierMoveRequestedPacketAction(
  packetType: any,
  stateManager: GameStateManager,
  data: any
) {
  try {
    var { expectedPositionX, expectedPositionY, soldiers } = data;

    //soldiers can be array or comma seperated string with ids
    if (typeof data.soldiers === "string") soldiers = data.soldiers.split(",");
    else soldiers = data.soldiers;
    soldiers.forEach((soldierId: string) => {
      soldierId = `${soldierId}`;
      let soldier = stateManager.getClient(socket.id)?.getSoldier(soldierId);
      soldier?.setTargetPosition(expectedPositionX, expectedPositionY);
      soldier?.stateMachine.controller.send("Move");
    });
  } catch (err) {
    console.log(err);
  }

  //NOTE ; Not sending delta-update for this, a tick call should be able to send movements
  //on its own.
}

function SoldierSpawnRequestedPacketAction(
  packetType: any,
  stateManager: GameStateManager,
  data: { soldierType: any }
) {
  let player = stateManager.getClient(socket.id);
  let { soldierType } = data;
  if (!player) return;
  let queuedSpawnRequest = player.queueSoldierSpawnRequest(soldierType);
  var updatePacket = {
    type: PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED,
    ...queuedSpawnRequest,
    playerId: player.id,
  };
}

/**
 * data:
 * {
 *  soldierType
 * }
 */
function SoldierCreateRequestedPacketAction(
  packetType: string,
  stateManager: GameStateManager,
  data: any
) {
  let playerId = stateManager.getClient(socket.id)?.id;
  if (!playerId) return;
  let { soldierType, currentPositionX, currentPositionY } = data;
  let createStatus = stateManager.createSoldier(
    currentPositionX,
    currentPositionY,
    soldierType,
    playerId
  );
  if (!createStatus) return;
  let updatePacket: any = {
    type: PacketType.ByServer.SOLDIER_CREATE_ACK,
    isCreated: createStatus.status,
  };
  if (createStatus.status) {
    //record whatever things we've modified in this array
    updatePacket = {
      ...updatePacket,
      soldier: createStatus.soldier!.getSnapshot(), //detail of soldier
      playerId, //person who created soldier
      soldierType,
    };
  }
}

function SoldierDeletedPacketAction(
  packetType: any,
  stateManager: GameStateManager,
  data: any
) {
  let { soldierId }: { soldierId: string } = data;
  let player = stateManager.getClient(socket.id);
  if (!player) return;
  let isRemoved = player.removeSoldier(soldierId, stateManager);
  if (!isRemoved) return;
  //broadcast data to all the players.
  const deltaPacket = {
    type: packetType,
    soldierId,
    playerId: player.id,
  };
}

function AttackRequestedPacketAction(
  packetType: string,
  stateManager: GameStateManager,
  data: any
) {
  try {
    var { soldiers, targetPlayerId, targetSoldierId } = data;
    soldiers = soldiers.split(",");

    //Attack Initiator
    let playerA = stateManager.getClient(socket.id);

    //Target Player's attacked unit.
    let playerB = stateManager.getPlayerById(targetPlayerId);

    let targetSoldier = playerB?.getSoldier(targetSoldierId);
    if (!targetSoldier) return;

    //Soldiers belonging to Attacker, that are given attack order.
    soldiers.forEach((soldierId: string) => {
      let attacker = playerA?.getSoldier(soldierId);
      attacker?.attackUnit(targetSoldier!, stateManager);
    });
  } catch (err) {
    console.log(err);
  }
}

function ChatMessagePacketAction(
  packetType: any,
  stateManager: GameStateManager,
  data: any
) {
  let { message } = data;
  let senderId = stateManager.getClient(socket.id)?.id;
  if (!senderId) return;
  //broadcast data to all the players.
  const deltaPacket = {
    type: PacketType.ByServer.NEW_CHAT_MESSAGE,
    message,
    playerId: senderId,
  };
}

function SpawnPointRequestedAction(
  packetType: any,
  stateManager: GameStateManager,
  data: any
) {
  let { spawnX, spawnY } = data;
  let playerId = stateManager.getClient(socket.id)?.id;
  if (!playerId) return;
  stateManager.getClient(socket.id)?.setSpawnPoint(spawnX, spawnY);
  const deltaPacket = {
    type: PacketType.ByServer.SPAWN_POINT_ACK,
    spawnX,
    spawnY,
    playerId,
  };
}

export default {
  PlayerInitPacketAction,
  PlayerReadyPacketAction,
  PlayerUnreadyPacketAction,
  PlayerJoinedPacketAction,
  PlayerLeftPacketAction,
  PlayerLostPacketAction,
  SoldierMoveRequestedPacketAction,
  SoldierCreateRequestedPacketAction,
  SoldierDeletedPacketAction,
  AttackRequestedPacketAction,
  ChatMessagePacketAction,
  SpawnPointRequestedAction,
  SoldierSpawnRequestedPacketAction,
};
