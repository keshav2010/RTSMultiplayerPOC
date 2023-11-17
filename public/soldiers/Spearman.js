const { GAMEEVENTS } = require('../constant');
import { BaseSoldier } from './BaseSoldier';
const { SoldierType } = require('../../common/SoldierType')
export class Spearman extends BaseSoldier {
    /**
     * @param {*} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string|Phaser.Textures.Texture} texture 
     * @param {string|number <optional>} frame
     */
    constructor(scene, x, y, texture, frame, initialParam) {
        super(scene, x, y, texture, frame, initialParam);
        this.soldierType = SoldierType.SPEARMAN.id;
    }
    onClicked() {
    }
    update(elapsedTime, deltaTime) {
        if (super.update)
            super.update();
        let diffX = this.expectedPositionX - this.x;
        let diffY = this.expectedPositionY - this.y;
        let mag = Math.sqrt(diffX * diffX + diffY * diffY);
        if (mag === 0)
            return;
        diffX = diffX / mag;
        diffY = diffY / mag;
        this.setPosition(this.x + diffX * 100 * deltaTime, this.y + diffY * 100 * deltaTime);
    }
}