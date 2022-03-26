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
    }
    preUpdate(elapsedTime, deltaTime){

    }
    update(elapsedTime, deltaTime){

    }
}