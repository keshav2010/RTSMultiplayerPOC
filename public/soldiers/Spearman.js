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
    constructor (scene, x, y, texture, frame, initialParam)
    {
        super(scene, x, y, texture, frame, initialParam);
        this.soldierType='SPEARMAN';
    }
    onClicked(){
    }
    preUpdate(elapsedTime, deltaTime){

    }
    update(elapsedTime, deltaTime){

    }
}