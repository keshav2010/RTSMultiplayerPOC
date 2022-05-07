/**
 * These Functions should only affect game state,
 * they must also populate DeltaUpdate arrays [cumulativeUpdates, etc].
 * 
 * They must not do any sort of networking
 * 
 * These functions should only update game state variables.
 */

const Player = require("./Player");
const PacketType = require("../common/PacketType")

function PlayerInitPacketAction(packetType, socket, io, stateManager){
    try{
        console.log(`Player ${socket.id} just joined and a packet is scheduled for it.`)
        if(!stateManager.SocketToPlayerData.has(socket.id))
            stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));

        const deltaUpdate = {
            type: packetType,
            socket,
            playerId: socket.id,
            players: [...stateManager.SocketToPlayerData.values()],
            readyPlayers: [...stateManager.ReadyPlayers.values()]
        }
        stateManager.clientInitUpdates.push(deltaUpdate);

        //If someone joins in late, they should get update of already-created soldiers
        [...stateManager.SocketToPlayerData.values()].filter(v=>v.id !== socket.id).forEach(opponent=>{
            if(opponent.SoldierMap.size < 1)
                return;
            [...opponent.SoldierMap.values()].forEach((s)=>{
                let initPacket = {
                    type: PacketType.ByServer.SOLDIER_CREATE_ACK,
                    isCreated: true,

                    socket, //init packets are sent only to the player who joined and not to other players

                    soldier: s.getSnapshot(), //detail of soldier
                    playerId: s.getSnapshot().playerId, //person who created soldier
                    soldierType: s.getSnapshot().type
                }
                stateManager.clientInitUpdates.push(initPacket);
            });
        })
    }
    catch(err){
        console.log(err);
    }
}

function PlayerJoinedPacketAction(packetType, socket, io, stateManager){
    try{
        console.log(`Player ${socket.id} Joined.`)
        if(stateManager.GameStarted){
            socket.disconnect();
            return;
        }
        if(!stateManager.SocketToPlayerData.has(socket.id)){
            stateManager.SocketToPlayerData.set(socket.id, new Player(socket.id));
        }

        const deltaUpdate={
            type: packetType,
            player: stateManager.SocketToPlayerData.get(socket.id)
        }
        stateManager.cumulativeUpdates.push(deltaUpdate);
    }
    catch(err){
        console.log(err);
    }
}

function PlayerReadyPacketAction(packetType, socket, io, stateManager){
    try{
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
    catch(err){
        console.log(err);
    }
}

function PlayerUnreadyPacketAction(packetType, socket, io, stateManager){
    try{
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
    catch(err){
        console.log(err);
    }
}

function PlayerLeftPacketAction(packetType, socket, io, stateManager){
    try{
        console.log(`Player ${socket.id} Left/Disconnected.`)

        console.log(`ClearObject for player ${socket.id}`);
        stateManager.SocketToPlayerData.get(socket.id).clearObject(stateManager);

        //update the collision detection part
        stateManager.scene.update();

        stateManager.SocketToPlayerData.delete(socket.id);
        stateManager.ReadyPlayers.delete(socket.id);

        if(stateManager.SocketToPlayerData.size === 0)
            stateManager.GameStarted=false;

        const deltaUpdate={
            type:packetType,
            playerId: socket.id
        }
        stateManager.cumulativeUpdates.push(deltaUpdate);
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
        let playerId = socket.id;
        var {expectedPositionX, expectedPositionY, soldiers} = data;

        //soldiers can be array or comma seperated string with ids
        if(typeof data.soldiers === 'string')
            soldiers = data.soldiers.split(',');
        else soldiers = data.soldiers;
        soldiers.forEach(soldierId=>{
            soldierId=''+soldierId;
            let soldier = stateManager.SocketToPlayerData.get(playerId).getSoldier(soldierId);
            if(soldier)
                soldier.setTargetPosition(expectedPositionX, expectedPositionY);
        });
    }catch(err){
        console.log(err);
    }

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
    let {soldierType, currentPositionX, currentPositionY} = data;
    let createStatus = stateManager.createSoldier(currentPositionX, currentPositionY, soldierType, playerId)
    var updatePacket = {
        type: PacketType.ByServer.SOLDIER_CREATE_ACK,
        isCreated: createStatus.status
    };
    if(createStatus.status)
    {
        //record whatever things we've modified in this array
        updatePacket={
            ...updatePacket,
            soldier: createStatus.soldier.getSnapshot(), //detail of soldier
            playerId, //person who created soldier
            soldierType
        }
    }
    stateManager.cumulativeUpdates.push(updatePacket);
}

function SoldierDeletedPacketAction(packetType, socket, io, stateManager, data){
    let playerId = socket.id;
    let {soldierId} = data;
    stateManager.socketToPlayerData.get(playerId).removeSoldier(soldierId, stateManager);

    //broadcast data to all the players.
    const deltaPacket = {
        type: packetType,
        soldierId,
        playerId
    }
    stateManager.cumulativeUpdates.push(deltaPacket);
}

function AttackRequestedPacketAction(packetType, socket, io, stateManager, data){
    
    var {soldiers, targetPlayerId, targetSoldierId} = data;
    soldiers=soldiers.split(',');
    stateManager.initiateAttack(socket.id, soldiers, targetPlayerId, targetSoldierId);
}

function ChatMessagePacketAction(packetType, socket, io, stateManager, data){
    let {message} = data;
    let senderId = socket.id;
    //broadcast data to all the players.
    const deltaPacket = {
        type: PacketType.ByServer.NEW_CHAT_MESSAGE,
        message,
        playerId: senderId
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
    SoldierDeletedPacketAction,
    AttackRequestedPacketAction,
    ChatMessagePacketAction
}