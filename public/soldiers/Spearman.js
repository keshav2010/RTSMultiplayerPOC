const {GAMEEVENTS} = require('../constant');
import {BaseSoldier} from './BaseSoldier';
export class Spearman extends BaseSoldier {
    /**
     * @param {*} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string|Phaser.Textures.Texture} texture 
     * @param {string|number <optional>} frame
     */
    constructor (scene, x, y, texture, frame)
    {
        super(scene, x, y, texture, frame, {
            health: 25,
            speed: 10,
            damage: 5,
            cost: 5,
            range: 5
        });
        this.soldierType='SPEARMAN';
    }
    preUpdate(elapsedTime, deltaTime){

    }
    update(elapsedTime, deltaTime){

    }

    onSelected(){
        //draw outline
        this.alpha = 0.5;
        this.scale=1.5;
        setTimeout(()=>{
            this.onUnselected();
        }, 2000);
    }
    onUnselected(){
        //remove outline
        this.alpha = 1;
        this.scale=1;
    }
}