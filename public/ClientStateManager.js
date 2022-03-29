
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

        //register soldier
        this.scene.events.on(GAMEEVENTS.SOLDIER_CREATED, (data)=>{

        });

        //initialise player
        this.scene.events.on(PacketType.ByServer.PLAYER_INIT, (data)=>{
            console.log('Player Init ');
            const {playerId, players, readyPlayers} = data;
            this.playerId = playerId;
            players.forEach(player =>{
                this.addPlayer(new Player(this.scene, player.id, player.name))
            });
        });


        this.scene.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            console.log('Player Joined ', data);

        });
        this.scene.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            console.log('Player Ready ', data);

        });
        this.scene.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            console.log('Player Unready ', data);

        });
        this.scene.events.on(PacketType.ByServer.PLAYER_LEFT, (data)=>{
            console.log('Player Left ', data);

        });

        this.scene.events.on(GAMEEVENTS.SOLDIER_SELECTED, (d)=>{
            this.selectedSoldiers.set(d.id, d);
            console.log(this.selectedSoldiers)
        })

        //gameplay events
        this.scene.events.on(PacketType.ByServer.SOLDIER_CREATE_ACCEPTED, (data)=>{

        });
        this.scene.events.on(PacketType.ByServer.SOLDIER_CREATE_REJECTED, (data)=>{

        });
    }
    addPlayer(player){
        console.log('adding player ', player);
        player.addSoldier(new Spearman(this.scene, 620, 420, 'spearman'));
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
}
module.exports = ClientStateManager;