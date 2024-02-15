import { PlayerState } from "../../gameserver/schema/PlayerState";
import LoadingBar from "../LoadingBar";

export class PlayerCastle extends Phaser.GameObjects.Sprite {
  player: PlayerState;
  hp: LoadingBar;
  DEBUGTEXT: any;
  health: number;

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
      health: number,
      player: PlayerState
    }
  ) {
    super(scene, x, y, texture, frame);
    this.health = initialParam?.health || 100;
    //add object to scene
    scene.add.existing(this);
    this.player = initialParam.player;
    //this.setInteractive();
    scene.events.on("update", this.update, this);
    this.setPosition(x, y);
    this.scale = 1;
    this.hp = new LoadingBar(scene, this);
    this.DEBUGTEXT = scene.add.text(
      x,
      y + this.height / 2 + 15,
      `[${this.player.name}] - health:${this.player.spawnFlagHealth}`,
      { font: "12px Arial" }
    );
    this.DEBUGTEXT.setOrigin(0.5);
    this.on("destroy", () => {
      scene.events.off("update");
      this.hp.destroy();
      this.DEBUGTEXT.destroy();
    });
  }
  setPos(x: number, y: number) {
    this.setPosition(x, y);
  }
  setHealth(newHealth: number) {
    this.health = newHealth;
    this.hp.currentValue = newHealth;
  }
  update() {
    this.hp.draw();
    this.DEBUGTEXT.setPosition(this.x, this.y + this.height / 2 + 15);
    this.DEBUGTEXT.setText(
      `[${this.player.name}] - health:${this.player.spawnFlagHealth}`
    );
  }
}
