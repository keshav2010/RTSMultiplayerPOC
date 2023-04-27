/**
 * These Functions should only affect game state,
 * they must also populate DeltaUpdate arrays [cumulativeUpdates, etc].
 * 
 * They must not do any sort of networking
 * 
 * These functions should only update game state variables.
 */

const Player = require("./Player");
const PacketType = require("../common/PacketType");
const { v4: uuidv4 } = require("uuid");

function PlayerInitPacketAction(packetType, socket, io, stateManager, {playerName}){
    try{
        const playerId = `pid${uuidv4()}`;
        console.log(`[INIT_PACKET setup]-Player ${playerName} (${playerId}) Joined.`);
        let player = new Player(playerId, playerName);
        stateManager.registerPlayer(socket, player);

        //the main init packet, the "socket" property is added to ensure packet is only
        //delivered over this specified socket instead of broadcast to all clients.
        let players =  stateManager.getPlayers();
        const deltaUpdate = {
            type: packetType,
            socket,
            playerId,
            players: players.map(player => player.getSnapshot())
        }
        stateManager.enqueueStateUpdate(deltaUpdate);

        //inform new player about existing units.
        players.filter(p=>p.id !== playerId).forEach(opponent=>{
            if(opponent.SoldierMap.size < 1)
                return;
            [...opponent.SoldierMap.values()].forEach((s)=> {
                let soldierSnapshot = s.getSnapshot();
                
                let initPacket = {
                    type: PacketType.ByServer.SOLDIER_CREATE_ACK,
                    isCreated: true,
                    socket,
                    soldier: soldierSnapshot, //detail of soldier
                    playerId: soldierSnapshot.playerId, //person who created soldier
                    soldierType: soldierSnapshot.type
                }
                stateManager.enqueueStateUpdate(initPacket);
            });
        })

        process.send({
          type: "SESSION_UPDATED",
          sessionId: stateManager.sessionId,
          gameStarted: stateManager.GameStarted,
          players: stateManager.getPlayers().length,
        });
    }
    catch(err){
        console.log(err);
    }
}

function PlayerJoinedPacketAction(packetType, socket, io, stateManager){
    try{
        const player = stateManager.getPlayer(socket.id);
        console.log(`Player ${player.id} Attempting to Join.`);
        if(stateManager.GameStarted){
            console.log(`Game Started, Disconnecting player${player.id}`);
            socket.disconnect();
            return;
        }
        const deltaUpdate={
            type: packetType,
            player: player.getSnapshot()
        }
        stateManager.enqueueStateUpdate(deltaUpdate);
    }
    catch(err){
        console.log(err);
    }
}

function PlayerReadyPacketAction(packetType, socket, io, stateManager){
    try{
        const player = stateManager.getPlayer(socket.id);
        console.log(`Player ${player.id} Marked ready.`);
        player.readyStatus = true;
        let readyPlayersCount = stateManager.getPlayers().filter(p => p.readyStatus).length;
        if(readyPlayersCount === stateManager.getPlayers().length)  {
            stateManager.startGame();
        }
        const deltaUpdate = {
            type:packetType,
            playerId: player.id,
            startGame:stateManager.GameStarted
        }
        stateManager.enqueueStateUpdate(deltaUpdate);
    }
    catch(err){
        console.log(err);
    }
}

function PlayerUnreadyPacketAction(packetType, socket, io, stateManager){
    try{
        const player = stateManager.getPlayer(socket.id);
        console.log(`Player ${player.id} Trying to mark itself Unready.`);
        let readyPlayersCount = stateManager.getPlayers().filter(p => p.readyStatus).length;
        if(stateManager.GameStarted || readyPlayersCount === stateManager.getPlayers().length) {
            if(!stateManager.GameStarted)
                stateManager.startGame();
            return;
        }
        player.readyStatus = false;
        const deltaUpdate = {
            type: packetType,
            playerId: player.id,
            startGame:stateManager.GameStarted
        }
        stateManager.enqueueStateUpdate(deltaUpdate);
    }
    catch(err){
        console.log(err);
    }
}

function PlayerLeftPacketAction(packetType, socket, io, stateManager){
    try{
        let player = stateManager.getPlayer(socket.id);
        console.log(`Player ${player.id} Left/Disconnected.`)
        player?.destroy(stateManager);
        stateManager.removePlayer(socket.id);
        const deltaUpdate={
            type:packetType,
            playerId: player.id
        }
        stateManager.enqueueStateUpdate(deltaUpdate);
        process.send({
          type: "SESSION_UPDATED",
          sessionId: stateManager.sessionId,
          gameStarted: stateManager.GameStarted,
          players: stateManager.getPlayers().length,
        });
    }
    catch(err){
        console.log(err);
    }
}

function PlayerLostPacketAction(packetType, socket, io, stateManager){
    try{
        let player = stateManager.getPlayer(socket.id);
        console.log(`Player ${player.id} Lost.`)
        player?.destroy(stateManager);
        const deltaUpdate={
            type:packetType,
            playerId: player.id
        }
        stateManager.enqueueStateUpdate(deltaUpdate);
    }
    catch(err){
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
function SoldierMoveRequestedPacketAction(packetType, socket, io, stateManager, data){
    try{
        var {expectedPositionX, expectedPositionY, soldiers} = data;

        //soldiers can be array or comma seperated string with ids
        if(typeof data.soldiers === 'string')
            soldiers = data.soldiers.split(',');
        else soldiers = data.soldiers;
        soldiers.forEach(soldierId=>{
            soldierId= `${soldierId}`;
            let soldier = stateManager.getPlayer(socket.id).getSoldier(soldierId);
            soldier?.setTargetPosition(expectedPositionX, expectedPositionY);
        });
    }catch(err){
        console.log(err);
    }

    //NOTE ; Not sending delta-update for this, a tick call should be able to send movements
    //on its own.
}


function SoldierSpawnRequestedPacketAction(
    packetType,
    socket,
    io,
    stateManager,
    data
  ) {
    let player = stateManager.getPlayer(socket.id);
    let { soldierType } = data;
    let queuedSpawnRequest = player.queueSoldierSpawnRequest(soldierType);
    var updatePacket = {
      type: PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED,
      ...queuedSpawnRequest,
      playerId: player.id,
    };
    stateManager.enqueueStateUpdate(updatePacket);
  }
  
/**
 * data:
 * {
 *  soldierType
 * }
 */
function SoldierCreateRequestedPacketAction(
  packetType,
  socket,
  io,
  stateManager,
  data
) {
  let playerId = stateManager.getPlayer(socket.id).id;
  let { soldierType, currentPositionX, currentPositionY } = data;
  let createStatus = stateManager.createSoldier(
    currentPositionX,
    currentPositionY,
    soldierType,
    playerId
  );
  var updatePacket = {
    type: PacketType.ByServer.SOLDIER_CREATE_ACK,
    isCreated: createStatus.status,
  };
  if (createStatus.status) {
    //record whatever things we've modified in this array
    updatePacket = {
      ...updatePacket,
      soldier: createStatus.soldier.getSnapshot(), //detail of soldier
      playerId, //person who created soldier
      soldierType,
    };
  }
  stateManager.enqueueStateUpdate(updatePacket);
}


function SoldierDeletedPacketAction(packetType, socket, io, stateManager, data){
    let {soldierId} = data;
    let player = stateManager.getPlayer(socket.id);
    let isRemoved = player.removeSoldier(soldierId, stateManager);
    if(!isRemoved)
        return;
    //broadcast data to all the players.
    const deltaPacket = {
        type: packetType,
        soldierId,
        playerId: player.id
    }
    stateManager.enqueueStateUpdate(deltaPacket);
}

function AttackRequestedPacketAction(
  packetType,
  socket,
  io,
  stateManager,
  data
) {
  try {
    var { soldiers, targetPlayerId, targetSoldierId } = data;
    soldiers = soldiers.split(",");

    //Attack Initiator
    let playerA = stateManager.getPlayer(socket.id);

    //Target Player's attacked unit.
    let playerB = stateManager.getPlayerById(targetPlayerId);

    let targetSoldier = playerB?.getSoldier(targetSoldierId);
    if (!targetSoldier) return;

    //Soldiers belonging to Attacker, that are given attack order.
    soldiers.forEach((soldierId) => {
      let attacker = playerA.getSoldier(soldierId);
      attacker.attackUnit(targetSoldier, stateManager);
    });
  } catch (err) {
    console.log(err);
  }
}

function ChatMessagePacketAction(packetType, socket, io, stateManager, data){
    let {message} = data;
    let senderId = stateManager.getPlayer(socket.id).id;
    //broadcast data to all the players.
    const deltaPacket = {
        type: PacketType.ByServer.NEW_CHAT_MESSAGE,
        message,
        playerId: senderId
    }
    stateManager.enqueueStateUpdate(deltaPacket);
}

function SpawnPointRequestedAction(packetType, socket, io, stateManager, data){
    let {spawnX, spawnY} = data;
    let playerId = stateManager.getPlayer(socket.id).id;
    stateManager.getPlayer(socket.id).setSpawnPoint(spawnX, spawnY);
    const deltaPacket = {
        type: PacketType.ByServer.SPAWN_POINT_ACK,
        spawnX,
        spawnY,
        playerId
    }
    stateManager.enqueueStateUpdate(deltaPacket);
}

module.exports={
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
    SoldierSpawnRequestedPacketAction
}