/**
 * These Functions should only affect game state,
 * they must also populate DeltaUpdate arrays [cumulativeUpdates, etc].
 * 
 * They must not do any sort of networking
 * 
 * These functions should only update game state variables.
 */

const Player = require("./Player");

function PlayerInitPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} just joined and a packet is scheduled for it.`)
    stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));

    const deltaUpdate = {
        type: packetType,
        socket,
        playerId: socket.id,
        players: [...stateManager.SocketToPlayerData.values()],
        readyPlayers: [...stateManager.ReadyPlayers.values()]
    }

    stateManager.clientInitUpdates.push(deltaUpdate);
}

function PlayerJoinedPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Joined.`)
    if(stateManager.GameStarted){
        socket.disconnect();
        return;
    }

    stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));

    const deltaUpdate={
        type: packetType,
        player: stateManager.SocketToPlayerData.get(socket.id)
    }
    stateManager.cumulativeUpdates.push(deltaUpdate);
}

function PlayerReadyPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Marked ready.`)
    stateManager.ReadyPlayers.set(socket.id, true);
    if(stateManager.ReadyPlayers.size === stateManager.SocketToPlayerData.size)
        stateManager.GameStarted = true;
    
    const deltaUpdate = {
        type:packetType,
        playerId:socket.id,
        startGame:stateManager.GameStarted
    }
    //Whose Ready and whether to start game ?
    stateManager.cumulativeUpdates.push(deltaUpdate);
}

function PlayerUnreadyPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Marked Unready.`)
    if(stateManager.GameStarted || stateManager.ReadyPlayers.size === stateManager.SocketToPlayerData.size){
        stateManager.GameStarted = true;
        return;
    }

    //mark as unready and addTo cumulative update
    stateManager.ReadyPlayers.delete(socket.id);
    
    const deltaUpdate = {
        type: packetType,
        playerId: socket.id,
        startGame:stateManager.GameStarted
    }
    //Whose not ready and game-start status
    stateManager.cumulativeUpdates.push(deltaUpdate);
}

function PlayerLeftPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Left/Disconnected.`)
    
    stateManager.SocketToPlayerData.delete(socket.id);
    stateManager.ReadyPlayers.delete(socket.id);

    if(stateManager.SocketToPlayerData.size === 0){
        stateManager.GameStarted=false;
    }

    const deltaUpdate={
        type:packetType,
        playerId: socket.id
    }
    //Who Left
    stateManager.cumulativeUpdates.push(deltaUpdate);
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
    let playerId = socket.id;
    let {posX, posY} = data;
    var soldiers;

    //soldiers can be array or comma seperated string with ids
    if(typeof data.soldiers === 'string')
        soldiers = data.soldiers.split(',');
    else soldiers = data.soldiers;

    soldiers.forEach(soldierId=>{
        stateManager.SocketToPlayerData.get(playerId).getSoldier(soldierId).setTargetPosition(posX, posY);
    });

    //NOTE ; Not sending delta-update for this, a tick call should be able to send movements
    //on its own.
}


/**
 * data:
 * {
 *  soldierType
 * }
 */
function SoldierCreateRequestedPacketAction(packetType, socket, io, stateManager, data){
    let playerId = socket.id;
    let {soldierType} = data;
    let createStatus = stateManager.SocketToPlayerData.get(playerId).createSoldier(soldierType);
    
    var updatePacket = {
        type:PacketType.SOLDIER_CREATE_ACK,
        isCreated: createStatus.status
    };
    if(createStatus.status)
    {
        //record whatever things we've modified in this array
        updatePacket={
            ...updatePacket,
            soldierId: createStatus.soldierId,
            playerId,
            soldierType,
            resources: stateManager.SocketToPlayerData.get(playerId).resources
        }
    }
    stateManager.cumulativeUpdates.push(updatePacket);
}

function SoldierDeletedPacketAction(packetType, socket, io, stateManager, data){
    let playerId = socket.id;
    let {soldierId} = data;
    stateManager.socketToPlayerData.get(playerId).removeSoldier(soldierId);

    //broadcast data to all the players.
    const deltaPacket = {
        type: packetType,
        soldierId,
        playerId
    }
    stateManager.cumulativeUpdates.push(deltaPacket);
}

module.exports={
    PlayerInitPacketAction,
    PlayerReadyPacketAction,
    PlayerUnreadyPacketAction,
    PlayerJoinedPacketAction,
    PlayerLeftPacketAction,
    SoldierMoveRequestedPacketAction,
    SoldierCreateRequestedPacketAction,
    SoldierDeletedPacketAction
}