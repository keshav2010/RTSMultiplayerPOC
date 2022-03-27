
const {GAMEEVENTS} = require('./constant');
const PacketType = require('../common/PacketType');
const Player = require('./Player');

class ClientStateManager
{
    constructor(scene, socket)
    {
        this.scene = scene;
        this.selectedSoldiers = [];

        this.playerId;

        //All the players connected (including self)
        this.ConnectedPlayers = new Map();

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

            //TODO: handle ready packets
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
            this.selectedSoldiers.push(d);
        })

        //gameplay events
        this.scene.events.on(PacketType.ByServer.SOLDIER_CREATE_ACCEPTED, (data)=>{

        });
        this.scene.events.on(PacketType.ByServer.SOLDIER_CREATE_REJECTED, (data)=>{

        });
        
    }
    addPlayer(player){
        if(!this.ConnectedPlayers.has(player.id))
            this.ConnectedPlayers.set(player.id, player);
    }
    getPlayer(id){
        return this.ConnectedPlayers.get(id);
    }
    removePlayer(playerId){
        if(this.ConnectedPlayers.has(playerId))
            this.ConnectedPlayers.delete(playerId);
    }
}
module.exports = ClientStateManager;