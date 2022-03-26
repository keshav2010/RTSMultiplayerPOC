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

const TICKRATE = 8;
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

    var loop = (onEnd)=>{
        console.log('     tick');
        //read pending packets and update state
        var updatePacket = pendingUpdates.getClientRequest();
        if(updatePacket)
            updatePacket.updateStateManager(gameState);
        else {
            onEnd();
            return;
        }
        timeUtilised = (new Date().getTime() - startTime);
        if(timeUtilised < MAX_MS_PER_TICK){
            setImmediate(()=>{
                loop(onEnd);
            });
        }
        else{
            onEnd();
        }
    };
    loop(()=>{
        //Broadcast delta-changes to all connected clients
        gameState.broadcastCumulativeUpdate();
        gameState.broadcastClientInitUpdate();
        const newTickAfterMS = Math.abs(MAX_MS_PER_TICK - timeUtilised);

        //reschedule
        setTimeout(processPendingUpdates, newTickAfterMS);
        console.log('====tick end, time ', timeUtilised);
    });
}
setTimeout(processPendingUpdates, 0);




io.on('connection', socket=>{

    Packet.io = io;

    //add packets to stack
    pendingUpdates.queueClientRequest(new Packet(PacketType.ByServer.PLAYER_INIT, socket, {}, PacketActions.PlayerInitPacketAction));
    pendingUpdates.queueClientRequest(new Packet(PacketType.ByClient.PLAYER_JOINED, socket, {}, PacketActions.PlayerJoinedPacketAction));

    socket.on('disconnect', (reason)=>{
        pendingUpdates.queueClientRequest(new Packet(PacketType.ByServer.PLAYER_LEFT, socket, {}, PacketActions.PlayerLeftPacketAction));
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