const {GAMEEVENTS} = require('../constant');
const LoadingBar = require('../LoadingBar');

export class PlayerCastle extends Phaser.GameObjects.Sprite {

    /**
     * @param {*} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string|Phaser.Textures.Texture} texture 
     * @param {string|number <optional>} frame
     */
    constructor (scene, x, y, texture, frame, initialParam) {
        super(scene, x, y, texture, frame);
        //add object to scene
        scene.add.existing(this);
        
        this.player = initialParam.player;
        //this.setInteractive();
        scene.events.on('update', this.update, this);
        this.setPosition(x,y);
        this.scale = 1;
        this.hp = new LoadingBar(scene, this);
        this.DEBUGTEXT = scene.add.text(x, y+this.height/2+15, `[${this.player.name}] - health:${this.player.health}`, { font: "12px Arial", fill: "#ffffff" });
        this.DEBUGTEXT.setOrigin(0.5);
        this.on('destroy', ()=>{
            this.hp.destroy();
            this.DEBUGTEXT.destroy();
        })
    }
    setPos(x,y) {
        this.setPosition(x,y);
    }
    setHealth(newHealth) {
        this.health = newHealth;
        this.hp.currentValue=newHealth;
    }
    update() {
        this.hp.draw();
        this.DEBUGTEXT.setPosition(this.x, this.y+this.height/2+15);
        this.DEBUGTEXT.setText(`[${this.player.name}] - health:${this.player.health}`);
    }
}