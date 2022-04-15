
/**
 * Stores soldiers in a map ds
 */
const Soldier = require('./Soldier');
const {v4} = require('uuid');
const nbLoop = require('../common/nonBlockingLoop');
const PacketType = require('../common/PacketType');
const SoldierType = require('../common/SoldierType');

const uuidv = v4;
class Player
{
    static maxResources = 200;
    static resourceMultiplier=10; //per second
    constructor(id, name){
        this.name = name || 'Keshav';
        this.id = id;
        this.SoldierMap = new Map();
        this.resources = 100;

        //flag poss
        this.posX = 200+Math.random()*400;
        this.posY = 200+Math.random()*400;
    }
    tick(delta, updateManager, stateManager)
    {
        this.resources += Player.resourceMultiplier*delta;
        this.resources = Math.min(this.resources, Player.maxResources);

        //Queue delta update
        updateManager.queueServerEvent({
            type: PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
            playerId: this.id,
            resources: this.resources
        });

        let soldiersIdArr = [...this.SoldierMap.keys()];
        var i=0;
        var test = ()=>{return (i<soldiersIdArr.length)}
        var loop = ()=>{
            let soldierObject = this.SoldierMap.get(soldiersIdArr[i++]);
            soldierObject.tick(delta, updateManager, stateManager);
            return true; //continue
        }
        nbLoop(test, loop);
    }
    getSnapshot(){
        //get snapshot for each soldier
        var soldierSnapshots = [...this.SoldierMap.values().map(soldier=>soldier.getSnapshot())]
        return {
            name: this.name,
            id: this.id,
            resources: this.resources,
            posX: this.posX,
            posY: this.posY,
            soldiers: soldierSnapshots
        }
    }
    createSoldier(type, x, y){
        x = x||this.posX;
        y = y||this.posY;
        type=type||SoldierType.SPEARMAN;
        if(this.resources < 10)
            return {status:false};
        let s = new Soldier(type, {
            x, 
            y,
            health:100,
            speed:20,
            cost:5,
            damage:5,
            playerId: this.id
        }, this);
        this.resources -= 10;
        this.SoldierMap.set(s.id, s);
        return {status:true, soldierId: s.id, soldier:s};
    }
    getSoldier(soldierId){
        return this.SoldierMap.get(soldierId);
    }
    removeSoldier(id, stateManager)
    {
        this.SoldierMap.get(id).clearObject(stateManager);
        this.SoldierMap.delete(id);
    }
    clearObject(stateManager)
    {
        this.SoldierMap.forEach(soldier=>{
            soldier.clearObject(stateManager);
        });
        this.SoldierMap = new Map();
    }
}
module.exports = Player;