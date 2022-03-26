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
     * This function is expected to execute only once per client
     */
    broadcastClientInitUpdate(){
        if(this.clientInitUpdates.length === 0)
            return;

        this.clientInitUpdates.forEach(update=>{
            update.socket.emit(PacketType.ByServer.PLAYER_INIT, JSON.stringify({
                players: update.players,
                readyPlayers: update.readyPlayers
            }));
        })
    }
}

module.exports = GameStateManager;