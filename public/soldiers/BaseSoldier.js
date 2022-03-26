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
        scene.events.on('update', this.update, this);

        this.initialParam = initialParam || {};
        this.setData('health',this.initialParam.health || 25);
        this.setData('speed',this.initialParam.speed || 10);
        this.setData('damage',this.initialParam.damage || 10);
        this.setData('cost',this.initialParam.cost || 5);
        this.setData('range',this.initialParam.range || 5);

        this.setData('targetpos', new Phaser.Math.Vector2(x,y));
        this.setData('currentpos', new Phaser.Math.Vector2(x,y));
    }
}