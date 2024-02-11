import { SoldierType } from "../../common/SoldierType";
import { BaseSoldier } from "./BaseSoldier";
import Phaser from "phaser";
export class Spearman extends BaseSoldier {
  soldierType: SoldierType;
  /**
   * @param {*} scene
   * @param {number} x
   * @param {number} y
   * @param {string|Phaser.Textures.Texture} texture
   * @param {string|number <optional>} frame
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame: any,
    initialParam: {
      id: string;
      color?: number[];
      health?: number;
      speed?: number;
      damage?: number;
      cost?: number;
    },
    playerId: string
  ) {
    super(scene, x, y, texture, frame, initialParam, playerId);
    this.soldierType = "SPEARMAN";
  }
  onClicked() {}
  update(deltaTime: number) {
    super.update(deltaTime);
    let diffX = this.expectedPositionX - this.x;
    let diffY = this.expectedPositionY - this.y;
    let mag = Math.sqrt(diffX * diffX + diffY * diffY);
    if (mag === 0) return;
    diffX = diffX / mag;
    diffY = diffY / mag;
    this.setPosition(
      this.x + diffX * 100 * deltaTime,
      this.y + diffY * 100 * deltaTime
    );
  }
}
