const express = require('express');
const path = require('path');
const fs = require('fs');
const socketIO = require('socket.io');
require('dotenv').config()
const PORT = process.env.PORT || 3000;
const app = express();

const PacketType = require('./common/PacketType');
const Packet = require('./gameserver/Packet');
const PacketActions = require('./gameserver/PacketActions');

const GameStateManager = require('./gameserver/GameStateManager');
const cors = require('cors');

const nbLoop = require('./common/nonBlockingLoop');

app.use(cors())
app.use(express.static('dist'))
app.use(express.static('public'))

app.get('/', function(req, res){
    const pathName = path.resolve(__dirname);
    fs.readdir(pathName, (err, files)=>{
        if(err) {    
            console.log(err);
            return res.status(500).send('Internal Server Error, Try again later.');
        }
        
        var filename=files.find(file=> {
            return path.extname(file) === '.html';
        });
        if(filename == undefined) {
            return res.status(500).send(`<h1>ERROR! File not found at ${path}</h1>`)
        }
        var filepath = path.resolve(__dirname, 'dist', filename);
        console.log('serving file', filepath);
        res.sendFile(filepath);
    });
});

let httpServer = app.listen(PORT,()=>{console.log('Live @ ',PORT)});

//Init support for Websocket
const io = socketIO(httpServer);

const TICKRATE = 24;
const MAX_MS_PER_TICK = 1000/TICKRATE;
var gameState;

/**
 * Executed at frequency of TickRate
 */
function processPendingUpdates()
{
    //tick start time
    var startTime = new Date().getTime();
    var timeUtilised=0;

    var loop = ()=>{
        //read pending packets and update state
        var updatePacket = gameState.pendingUpdates.getClientRequest();
        if(updatePacket)
            updatePacket.updateStateManager(gameState);
        timeUtilised = (new Date().getTime() - startTime);
        return true;
    };
    var test = ()=>{return timeUtilised < MAX_MS_PER_TICK};
    nbLoop(test, loop, ()=>{
        gameState.simulate();

        //Broadcast delta-changes to all connected clients
        gameState.broadcastClientInitUpdate();
        gameState.broadcastCumulativeUpdate();
        
        let serverEvent;
        while(serverEvent = gameState.pendingUpdates.getServerEvent()){
            if(serverEvent){
                io.emit('tick', JSON.stringify({data: [serverEvent]}));
            }
        }
        const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);

        //run server loop only if connections exist
        if(io.of('/').sockets.size > 0){
            setTimeout(processPendingUpdates, newTickAfterMS);
        }
    });
}

//whenever a client is connected
io.on('connection', socket=>{
    console.log('***clients connected : ', io.of('/').sockets.size);
    if(io.of('/').sockets.size === 1){
        gameState = new GameStateManager(io);
        setImmediate(processPendingUpdates);
    }
    Packet.io = io;

    if(gameState.stateMachine.currentState === 'SpawnSelectionState'){
        //Initial packets
        gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByServer.PLAYER_INIT, socket, {}, PacketActions.PlayerInitPacketAction));
        gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_JOINED, socket, {}, PacketActions.PlayerJoinedPacketAction));
    }
    else{
        console.log('player connected but game not accepting connection at this point');
        socket.disconnect();
    }

    socket.on('disconnect', (reason)=>{
        console.log('***clients disconnected, active atm : ', io.of('/').sockets.size);
        gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByServer.PLAYER_LEFT, socket, {}, PacketActions.PlayerLeftPacketAction));
    })

    //client marked ready
    socket.on(PacketType.ByClient.PLAYER_READY, (data)=>{
        if(gameState.stateMachine.currentState === 'SpawnSelectionState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_READY, socket, data, PacketActions.PlayerReadyPacketAction));
    });

    //client is not ready
    socket.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
        if(gameState.stateMachine.currentState === 'SpawnSelectionState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_UNREADY, socket, data, PacketActions.PlayerUnreadyPacketAction));
    });

    //Client Requesting to move a soldier
    socket.on(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, (data)=>{
        if(gameState.stateMachine.currentState === 'BattleState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, socket, data, PacketActions.SoldierMoveRequestedPacketAction))
    });

    //Client requesting a new soldier
    socket.on(PacketType.ByClient.SOLDIER_CREATE_REQUESTED, (data)=>{
        if(gameState.stateMachine.currentState === 'BattleState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.SOLDIER_CREATE_REQUESTED, socket, data, PacketActions.SoldierCreateRequestedPacketAction))
    });

    //Client deleted their soldier
    socket.on(PacketType.ByClient.SOLDIER_DELETED, (data)=>{
        if(gameState.stateMachine.currentState === 'BattleState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.SOLDIER_DELETED, socket, data, PacketActions.SoldierDeletedPacketAction));
    });

    //Client Requesting Attack on other.
    socket.on(PacketType.ByClient.SOLDIER_ATTACK_REQUESTED, (data)=>{
        if(gameState.stateMachine.currentState === 'BattleState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.SOLDIER_ATTACK_REQUESTED, socket, data, PacketActions.AttackRequestedPacketAction));
    });

    //Client sent a chat message
    socket.on(PacketType.ByClient.CLIENT_SENT_CHAT, (data)=>{
        gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.CLIENT_SENT_CHAT, socket, data, PacketActions.ChatMessagePacketAction));
    })

    socket.on(PacketType.ByClient.SPAWN_POINT_REQUESTED, (data)=>{
        if(gameState.stateMachine.currentState === 'SpawnSelectionState')
            gameState.pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.SPAWN_POINT_REQUESTED, socket, data, PacketActions.SpawnPointRequestedAction));
    })
});