const PacketType = require('../common/PacketType');
const Player = require('./Player')
class ClientStateManager
{
    constructor(clientSocket)
    {
        this.socket = clientSocket;
        this.PlayerMap = new Map();
        this.GameState = 'VOTE';
    }

    //Updates state
    applyDeltaUpdate(deltaUpdate)
    {
        const type = deltaUpdate.type;
        switch(type){

            //this packet is sent only to 1 client.
            //This packet type can be used to setup initial
            //game state.
            case PacketType.ByServer.PLAYER_INIT:{
                
                break;
            }
            case PacketType.ByClient.PLAYER_JOINED:{
                let {player} = deltaUpdate;
                this.PlayerMap.set(player.id, player);
                break;
            }
            case PacketType.ByClient.PLAYER_READY:{
                let {playerId, startGame} = deltaUpdate;
                break;
            }
            case PacketType.ByClient.PLAYER_UNREADY:{
                let {playerId, startGame} = deltaUpdate;
                break;
            }
            
        }
    }

    tick()
    {

    }
}
module.exports = ClientStateManager;