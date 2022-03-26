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
    stateManager.clientInitUpdates.push({
        type: packetType,
        socket,
        players: [...stateManager.SocketToPlayerData.values()],
        readyPlayers: [...stateManager.readyPlayers.values()]
    })
}

function PlayerJoinedPacketAction(packetType, socket, io, stateManager){
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
    stateManager.ReadyPlayers.set(socketId, true);
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
    if(stateManager.GameStarted || stateManager.ReadyPlayers.size === stateManager.SocketToPlayerData.size){
        stateManager.GameStarted = true;
        return;
    }

    //mark as unready and addTo cumulative update
    stateManager.ReadyPlayers.delete(socketId);

    //Whose not ready and game-start status
    stateManager.cumulativeUpdates.push({
        type: packetType,
        playerId: socket.id,
        startGame:stateManager.GameStarted
    });
}

function PlayerLeftPacketAction(packetType, socket, io, stateManager){
    stateManager.SocketToPlayerData.delete(socket.id);
    stateManager.ReadyPlayers.delete(socket.id);

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