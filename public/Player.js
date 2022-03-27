const {v4} = require('uuid');
const uuidv = v4;

/**
 * Player gameobject holds resources and flag position (mostly static for now)
 */
class Player extends Phaser.GameObjects.Group
{
    constructor(scene, id, name){
        super(scene);

        this.dataManager = new Phaser.Data.DataManager(this);

        //group name will be player name
        this.setName(name || 'Keshav');
        this.playerId = id || `player_${uuidv()}`;

        //player property
        this.dataManager.set('resource', 100);
        this.dataManager.set('flagpos', {x: Math.random()*400, y:Math.random()*400});
        this.dataManager.set('health', 100);
    }
    
    //called when other client tries to hit the flag
    hitFlag()
    {
        this.dataManager.set('health', Math.max(0, this.dataManager.get('health')-10));
    }

    //create a soldier game object and add it to this group as well as scene
    addSoldier(soldierObject){
        this.add(soldierObject, true);
    }

    //remove a soldier object from the group
    removeSoldier(soldierObject){
        this.remove(soldierObject, true, true);
    }
}
 module.exports = Player;