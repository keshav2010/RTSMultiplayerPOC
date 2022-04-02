const {GAMEEVENTS} = require('../constant');
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
        this.x = x;
        this.y = y;

        this.on('pointerdown', (d)=>{
            
            this.scene.stateManager.selectedSoldiers.set(d.id, d);
            this.alpha = 0.5;
            this.scale = 1.5;

            //emit scene wide event
            this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
            if(this.onClicked){
                this.onClicked();
            }
        });
    }

    markSelected(){
        this.scene.stateManager.selectedSoldiers.set(this.id, this);
        this.alpha = 0.5;
        this.scale = 1.5;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
    }
    markUnselected(){
        this.scene.stateManager.selectedSoldiers.delete(this.id);
        this.alpha = 1;
        this.scale = 1;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
    }
}