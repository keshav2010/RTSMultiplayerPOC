
/**
 * Pure Player Class
 */
const SAT = require('sat');
class Player
{
    constructor(prop)
    {
        this.type="PLAYER";
        this.soldiers = new Set();
        this.spawnPosVec = new SAT.Vector(prop.posX, prop.posY);

        this.name = prop.name;
        this.playerId = prop.id;
        this.color = [...prop.color];
    }
    setSpawnPoint(x,y){
        this.spawnPosVec = new SAT.Vector(x,y);
    }
    getSpawnPoint() {
        return this.spawnPosVec;
    }
    update(time, deltaTime) {
        this.soldiers.forEach(child => child.update(time, deltaTime));
    }
    //create a soldier game object and add it to this group
    addSoldier(soldierObject){
        soldierObject.playerId = this.playerId;
        this.soldiers.add(soldierObject);
    }
    getSoldiers(){
        return [...this.soldiers];
    }
    getSoldier(id){
        return this.getSoldiers().filter(child=>child.id===id);
    }
    //remove a soldier object from the group
    removeSoldier(soldierObject){
        this.soldiers.delete(soldierObject);
        soldierObject.destroy();
    }
}
 module.exports = Player;