const PacketType = require('../common/PacketType');
const Player = require('./Player');
/**
 * Manages entire game state.
 */
class GameStateManager
{
    constructor(io)
    {
        this.clientInitUpdates = [];

        //all delta changes that we can send to client by serializing them or as a string whatever.
        this.cumulativeUpdates = [];

        this.io = io;

        this.GameStarted=false;
        this.SocketToPlayerData = new Map();
        this.ReadyPlayers = new Map();
    }


    /**
     * broadcast updates to all clients.
     * reset cumulativeUpdates container.
     */
    broadcastCumulativeUpdate()
    {
        //broadcast changes to everyone
        this.io.emit('tick', JSON.stringify({data:this.cumulativeUpdates}));

        //reset
        this.cumulativeUpdates = [];
    }

    /**
     * This function is expected to execute only once per client.
     */
    broadcastClientInitUpdate(){
        this.clientInitUpdates.forEach(deltaPacket=>{
            deltaPacket.socket.emit('tick', JSON.stringify({
                data:[{
                type: deltaPacket.type,
                playerId: deltaPacket.playerId,
                players: deltaPacket.players,
                readyPlayers: deltaPacket.readyPlayers}]
            }));
        })
        this.clientInitUpdates=[];
    }
}

module.exports = GameStateManager;