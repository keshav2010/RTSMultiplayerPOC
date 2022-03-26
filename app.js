const express = require('express');
const path = require('path');
const fs = require('fs');
const socketIO = require('socket.io');
const PORT = process.env.PORT || 3000;
const app = express();

const PacketType = require('./common/PacketType');
const Packet = require('./gameserver/Packet');
const PacketActions = require('./gameserver/PacketActions');

const PendingUpdateManager = require('./gameserver/PendingUpdateManager');
const GameStateManager = require('./gameserver/GameStateManager');
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

const TICKRATE = 25;
const MAX_MS_PER_TICK = 1000/TICKRATE;


const pendingUpdates = new PendingUpdateManager();
const gameState = new GameStateManager(io);


/**
 * Executed at frequency of TickRate
 */
function processPendingUpdates()
{

    //tick start time
    var startTime = new Date().getTime();
    var timeUtilised=0;

    //get pending update and apply it.
    var updatePacket = pendingUpdates.getClientRequest();
    while(timeUtilised < MAX_MS_PER_TICK && updatePacket)
    {
        //let packet modify game state
        updatePacket.updateStateManager(gameState);

        //how many ms elapsed
        timeUtilised = (new Date().getTime() - startTime);
        updatePacket = pendingUpdates.getClientRequest();
    }

    //Broadcast delta-changes to all connected clients
    gameState.broadcastCumulativeUpdate();
    gameState.broadcastClientInitUpdate();

    const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);
    console.log('next run after ', newTickAfterMS)

    //reschedule
    setTimeout(processPendingUpdates, newTickAfterMS);
}
setTimeout(processPendingUpdates, 0);




io.on('connection', socket=>{

    Packet.io = io;

    //add packets to stack
    pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_JOINED, socket, {}, PacketActions.PlayerJoinedPacketAction));
    pendingUpdates.queueClientRequest(new Packet(PacketType.ByServer.PLAYER_INIT, socket, {}, PacketActions.PlayerInitPacketAction));

    socket.on('disconnect', (reason)=>{
        pendingUpdates.queueClientRequest({
            type: PacketType.ByServer.PLAYER_LEFT,
            socket,
            io
        });
    })
    
    socket.on(PacketType.ByClient.PLAYER_READY, (data)=>{
        pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_READY, socket, data, PacketActions.PlayerReadyPacketAction));
    });
    socket.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
        pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_UNREADY, socket, data, PacketActions.PlayerUnreadyPacketAction));
    });
    socket.on(PacketType.ByClient.SOLDIER_CREATE_REQUESTED, (data)=>{

    });

    socket.on(PacketType.ByClient.SOLDIER_DELETED, (data)=>{

    });

    socket.on(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, (data)=>{
    
    });

    socket.emit('message', {x:50,y:50});
});