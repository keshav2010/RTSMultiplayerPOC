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
        console.log(initialParam.player);
        //add object to scene
        scene.add.existing(this);
        
        this.initialParam = initialParam || {};
        this.health = initialParam.player.health || 100;
        this.playerName = initialParam.player.name;

        //this.setInteractive();
        this.playerId=initialParam.player.id;
        scene.events.on('update', this.update, this);
        this.setPosition(x,y);
        this.scale = 1;
        this.hp = new LoadingBar(scene, this);
        this.DEBUGTEXT = scene.add.text(x, y+this.height/2, `[${this.playerName}] - health:${this.initialParam.health}`, { font: "12px Arial", fill: "#ffffff" });
        this.DEBUGTEXT.setOrigin(0.5);
        this.on('destroy', ()=>{
            this.hp.destroy();
            this.DEBUGTEXT.destroy();
        })
    }
    setHealth(newHealth) {
        this.health = newHealth;
        this.hp.currentValue=newHealth;
    }
    update() {
        this.hp.draw();
        this.DEBUGTEXT.setPosition(this.x, this.y+this.health/2);
        this.DEBUGTEXT.setText(`[${this.playerName}] - health:${this.health}`);
    }
}