const {v4} = require('uuid');
const uuidv = v4;

/**
 * Player gameobject holds resources and flag position (mostly static for now)
 */
class Player extends Phaser.GameObjects.Group
{
    constructor(scene, prop){
        super(scene);

        this.dataManager = new Phaser.Data.DataManager(this);

        //group name will be player name
        this.setName(prop.name || 'Keshav');
        this.playerId = prop.id;
        this.type="PLAYER"

        //player property
        this.dataManager.set('resource', prop.resources);
        this.dataManager.set('flagpos', {x: prop.posX, y: prop.posY});
        this.dataManager.set('health', prop.health || 100);
    }
    
    //called when other client tries to hit the flag
    hitFlag()
    {
        this.dataManager.set('health', Math.max(0, this.dataManager.get('health')-10));
    }

    update(time, deltaTime) {

        //update each soldier
        this.getChildren().forEach(child => child.update(time, deltaTime));
    }

    //create a soldier game object and add it to this group as well as scene
    addSoldier(soldierObject){
        soldierObject.playerId = this.playerId;
        this.add(soldierObject, true);
    }

    getSoldiers(){
        return this.getChildren();
    }
    getSoldier(id){
        let soldier = this.getChildren().filter(child=>child.id===id);
        return soldier;
    }

    //remove a soldier object from the group
    removeSoldier(soldierObject){
        soldierObject.destroy();
    }
}
 module.exports = Player;