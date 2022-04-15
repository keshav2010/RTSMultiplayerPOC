const {GAMEEVENTS} = require('../constant');
class HealthBar extends Phaser.GameObjects.Graphics {
    constructor (scene, parent)
    {
        super(scene, {
            x: parent.x,
            y: parent.y
        });
        this.width=25;
        this.height=4;

        scene.add.existing(this);
        this.parent = parent;
        this.maxValue = 100;
        this.depth=-1;
        this.currentValue = 100;
        this.draw();
    }
    decrease(damage){
        this.currentValue = Math.max(0, this.currentValue - damage);
    }
    draw ()
    {
        this.clear();
        this.copyPosition(this.parent);
        //  BG
        this.fillStyle(0x000000);
        this.fillRect(-10, 20, this.width, this.height);

        //  Health
        this.fillStyle(0xffffff);
        this.fillRect(-10, 20, this.width, this.height);

        // Actual health
        this.fillStyle((this.currentValue<30)?0xff0000:0x00ff00);
        let d = Math.floor((this.currentValue/this.maxValue) * this.width);
        this.fillRect(-10, 20, d, this.height);
    }
}
export class BaseSoldier extends Phaser.GameObjects.Sprite {

    /**
     * @param {*} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string|Phaser.Textures.Texture} texture 
     * @param {string|number <optional>} frame
     */
    constructor (scene, x, y, texture, frame, initialParam)
    {
        super(scene, x, y, texture, frame);

        //add object to scene
        scene.add.existing(this);
        this.setInteractive();
        this.id=initialParam.id;

        scene.events.on('update', this.update, this);

        this.initialParam = initialParam || {};
        this.setData('health',this.initialParam.health || 25);
        this.setData('speed',this.initialParam.speed || 10);
        this.setData('damage',this.initialParam.damage || 10);
        this.setData('cost',this.initialParam.cost || 5);

        this.expectedPositionX = x;
        this.expectedPositionY = y;
        this.setPosition(x,y);
        this.scale = 0.25;
        this.hp = new HealthBar(scene, this);
    }
    update(){
        this.hp.draw();
    }
    markSelected(){
        this.scene.stateManager.selectedSoldiers.set(this.id, this);
        this.alpha = 0.5;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
    }
    markUnselected(){
        this.scene.stateManager.selectedSoldiers.delete(this.id);
        this.alpha = 1;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
    }
}