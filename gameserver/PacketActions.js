/**
 * These Functions should only affect game state,
 * they must also populate DeltaUpdate arrays [cumulativeUpdates, etc].
 * 
 * They must not do any sort of networking
 * 
 * These functions are executed per-tick and are solely responsible 
 * for simulating game state on server
 */

const Player = require("./Player");

function PlayerInitPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} just joined and a packet is scheduled for it.`)
    stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));

    stateManager.clientInitUpdates.push({
        type: packetType,
        socket,
        playerId: socket.id,
        players: [...stateManager.SocketToPlayerData.values()],
        readyPlayers: [...stateManager.ReadyPlayers.values()]
    })
}

function PlayerJoinedPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Joined.`)
    if(stateManager.GameStarted){
        socket.disconnect();
        return;
    }

    stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));
    stateManager.cumulativeUpdates.push({
        type: packetType,
        player: stateManager.SocketToPlayerData.get(socket.id)
    });
}

function PlayerReadyPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Marked ready.`)
    stateManager.ReadyPlayers.set(socket.id, true);
    if(stateManager.ReadyPlayers.size === stateManager.SocketToPlayerData.size)
        stateManager.GameStarted = true;
    
    //Whose Ready and whether to start game ?
    stateManager.cumulativeUpdates.push({
        type:packetType,
        playerId:socket.id,
        startGame:stateManager.GameStarted
    });
}

function PlayerUnreadyPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Marked Unready.`)
    if(stateManager.GameStarted || stateManager.ReadyPlayers.size === stateManager.SocketToPlayerData.size){
        stateManager.GameStarted = true;
        return;
    }

    //mark as unready and addTo cumulative update
    stateManager.ReadyPlayers.delete(socket.id);

    //Whose not ready and game-start status
    stateManager.cumulativeUpdates.push({
        type: packetType,
        playerId: socket.id,
        startGame:stateManager.GameStarted
    });
}

function PlayerLeftPacketAction(packetType, socket, io, stateManager){
    console.log(`Player ${socket.id} Left/Disconnected.`)
    
    stateManager.SocketToPlayerData.delete(socket.id);
    stateManager.ReadyPlayers.delete(socket.id);

    if(stateManager.SocketToPlayerData.size === 0){
        stateManager.GameStarted=false;
    }
    //Who Left
    stateManager.cumulativeUpdates.push({
        type:packetType,
        playerId: socket.id
    });
}

module.exports={
    PlayerInitPacketAction,
    PlayerReadyPacketAction,
    PlayerUnreadyPacketAction,
    PlayerJoinedPacketAction,
    PlayerLeftPacketAction
}