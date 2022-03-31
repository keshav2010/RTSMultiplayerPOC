
/**
 * Stores soldiers in a map ds
 */
const {Soldier} = require('./Soldier');
const {v4} = require('uuid');
const nbLoop = require('../common/nonBlockingLoop');
const PacketType = require('../common/PacketType');

const uuidv = v4;
class Player
{
    constructor(id, name){
        this.name = name || 'Keshav';
        this.id = id || `player_${uuidv()}`;
        this.SoldierMap = new Map();
        this.resources = 100;

        //flag pos
        this.posX = 200+Math.random()*400;
        this.posY = 200+Math.random()*400;
    }

    tick(delta, updateManager){
        console.log('player ticking', delta);
        this.resources += 0.5*delta;
        this.resources = Math.min(this.resources, 103);

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
            soldierObject.tick(delta, updateManager);
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
        type=type||'spearman';
        if(this.resources < 10)
            return {status:false};
        let s = new Soldier(type, x, y);
        this.resources -= 10;
        this.SoldierMap.set(s.id, s);
        return {status:true, soldierId: s.id};
    }
    getSoldier(soldierId){
        return this.SoldierMap.get(soldierId);
    }
    removeSoldier(id){
        let isDeleted = this.SoldierMap.delete(id);
    }
}
module.exports = Player;