const PacketType = require('../common/PacketType');
const Player = require('./Player');
const EventEmitter = require('events');
const ServerLocalEvents = require('./ServerLocalEvents');
const Scene = require('./Scene');
const nbLoop = require('../common/nonBlockingLoop');
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
        this.lastSimulateTime_ms =new Date().getTime();
        this.event = new EventEmitter();
        this.scene = new Scene(this);
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
        try{
            this.clientInitUpdates.forEach(deltaPacket=>{
                
                //copy all other parameters except socket field
                let filtered = Object.keys(deltaPacket)
                .filter(key=>key!=='socket')
                .reduce((obj,key)=>{
                    obj[key]=deltaPacket[key]
                    return obj;
                }, {});

                deltaPacket.socket.emit('tick', JSON.stringify({
                    data:[filtered]
                }));
            })
            this.clientInitUpdates=[];
        }
        catch(err){
            console.log(err);
        }
    }

    simulate(updateManager)
    {
        try{
            var deltaTime = (new Date().getTime()-this.lastSimulateTime_ms)/1000;
            this.lastSimulateTime_ms = new Date().getTime();
            let playerIdArray = [...this.SocketToPlayerData.keys()];
            var i=0;
            var test = ()=>{return (i<playerIdArray.length)};
            var loop = ()=>{
                //simulate each player
                //console.log(1/deltaTime);
                let playerObject = this.SocketToPlayerData.get(playerIdArray[i++]);
                playerObject.tick(deltaTime, updateManager, this);
                return true;//continue loop
            }
            nbLoop(test, loop);
        }
        catch(err){
            console.log(err);
        }
    }

    //creates a new player object
    createPlayer(id){
        if(!this.SocketToPlayerData.has(id))
            this.SocketToPlayerData.set(id, new Player(id, null, this));
    }

    //remove player and all related soldiers.
    removePlayer(id){
        this.event.emit(ServerLocalEvents.SOLDIER_REMOVED, 'test');
    }

    //create soldier (type) for player
    createSoldier(x, y, type, playerId){
        let player = this.SocketToPlayerData.get(playerId);
        
        //create soldier and insert into scene also (for collision detection)
        let {status, soldierId, soldier} = player.createSoldier(type, x, y);
        if(status)
            this.scene.insertSoldier(soldier);

        this.event.emit(ServerLocalEvents.SOLDIER_CREATED, 'test');
        return {status, soldierId, soldier}
    }

    removeSoldier(playerId, soldierId){
        try{
            this.SocketToPlayerData.get(playerId).removeSoldier(soldierId, this);

            const deltaUpdate = {
                type: PacketType.ByServer.SOLDIER_KILLED,
                playerId: playerId,
                soldierId: soldierId
            }
            stateManager.cumulativeUpdates.push(deltaUpdate);
        }
        catch(err){

        }
    }

    //give a target position to soldier so it can move towards it
    setSoldierTargetPosition(playerId, soldierId, x, y){

    }

    //This method is called when Player-A initiate attack over Player-B
    //Note that A can attack only single unit at a time for now.
    initiateAttack(aPlayerId, aSoldierIdArr, bPlayerId, bSoldierId){
        try{
            let a = this.SocketToPlayerData.get(aPlayerId);
            let b = this.SocketToPlayerData.get(bPlayerId);
            let targetSoldier = b.getSoldier(bSoldierId);
            aSoldierIdArr.forEach(soldierId=>{
                let attacker = a.getSoldier(soldierId);
                attacker.attackUnit(targetSoldier);
            });
        }catch(err){
            console.log(err);
        }
    }
}

module.exports = GameStateManager;