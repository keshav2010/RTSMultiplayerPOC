
/**
*/
const Soldier = require('./Soldier');
const PacketType = require('../common/PacketType');
const SoldierType = require('../common/SoldierType');
const ServerLocalEvents = require('./ServerLocalEvents');
const Collision = require('detect-collisions');
class Scene
{
    constructor(stateManager){
        this.stateManager = stateManager;
        this.system = new Collision.System();

        this.stateManager.event.on(ServerLocalEvents.SOLDIER_CREATED, (data)=>{

        });
        this.stateManager.event.on(ServerLocalEvents.SOLDIER_REMOVED, (data)=>{

        });
        this.stateManager.event.on(ServerLocalEvents.SOLDIER_MOVED, (data)=>{

        });
        this.stateManager.event.on(ServerLocalEvents.PLAYER_REMOVED, (data)=>{

        });
    }
    removeSoldier(soldierObject){
        this.system.remove(soldierObject);
    }
    insertSoldier(soldierObject){
        this.system.insert(soldierObject);
    }
    update(){
        this.system.update();
    }
}
module.exports = Scene