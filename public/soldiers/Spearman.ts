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
    id: string,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame: any,
    color: number[],
    playerId: string
  ) {
    super(
      scene,
      id,
      x,
      y,
      texture,
      frame,
      color,
      playerId
    );
    this.soldierType = "SPEARMAN";
  }
  onClicked() {}
  update(deltaTime: number) {
    super.update(deltaTime);
  }
}
