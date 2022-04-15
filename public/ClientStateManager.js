
const {GAMEEVENTS} = require('./constant');
const PacketType = require('../common/PacketType');
const Player = require('./Player');
const { Spearman } = require('./soldiers/Spearman');

class ClientStateManager
{
    constructor(scene)
    {
        this.scene = scene;
        this.selectedSoldiers = new Map();

        //All the players connected (including self)
        this.ConnectedPlayers = new Map();
        this.playerId;

        //initialise player
        this.scene.events.on(PacketType.ByServer.PLAYER_INIT, (data)=>{
            const {playerId, players, readyPlayers} = data;
            this.playerId = playerId;
            players.forEach(player =>{
                this.addPlayer(new Player(this.scene, player))
            });
        });

        this.scene.events.on(PacketType.ByServer.SOLDIER_POSITION_UPDATED, (data)=>{
            var {soldier, type} = data;
            this.ConnectedPlayers.get(soldier.playerId).getChildren().forEach(s =>{
                if(s.id === soldier.id){
                    //no interpolation applied for now
                    s.x = soldier.currentPositionX;
                    s.y = soldier.currentPositionY;
                    s.expectedPositionX = soldier.currentPositionX;
                    s.expectedPositionY = soldier.currentPositionY;
                }
            });
        })

        this.scene.events.on(GAMEEVENTS.SOLDIER_SELECTED, (d)=>{
            this.selectedSoldiers.set(d.id, d);
        });
    }
    addPlayer(player){
        console.log('Adding Player : ', player);
        if(!this.ConnectedPlayers.has(player.playerId))
            this.ConnectedPlayers.set(player.playerId, player);
    }
    getPlayer(id){
        return this.ConnectedPlayers.get(id || this.playerId);
    }
    removePlayer(playerId){
        if(this.ConnectedPlayers.has(playerId))
            this.ConnectedPlayers.delete(playerId);
    }
    update(time, delta)
    {

        //update each player
        this.ConnectedPlayers.forEach((player, playerId)=>{
            player.update(time, delta);
        });

    }
}
module.exports = ClientStateManager;