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
    initialParam: {
      color?: number[];
      health?: number;
      speed?: number;
      damage?: number;
      cost?: number;
    },
    playerId: string
  ) {
    super(
      scene,
      id,
      x,
      y,
      texture,
      frame,
      {
        ...initialParam,
        speed: 10,
        damage: 2,
        health: 100,
        cost: 10,
      },
      playerId
    );
    this.soldierType = "SPEARMAN";
  }
  onClicked() {}
  update(deltaTime: number) {
    super.update(deltaTime);
  }
}
