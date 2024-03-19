import { PlayerState } from "../../gameserver/schema/PlayerState";
import LoadingBar from "../LoadingBar";
import Phaser from "phaser";

export class PlayerCastle extends Phaser.GameObjects.Sprite {
  player: PlayerState;
  hp: LoadingBar;
  DEBUGTEXT: Phaser.GameObjects.Text;
  health: number;
  circleOfInfluence: Phaser.GameObjects.Graphics | undefined;
  circleAnimation: Phaser.Tweens.Tween | undefined;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame: any,
    initialParam: {
      health: number;
      player: PlayerState;
    }
  ) {
    super(scene, x, y, texture, frame);
    this.health = initialParam?.health || 100;
    scene.add.existing(this);
    this.player = initialParam.player;
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
      scene.events.off("update", this.update, this);
      this.hp.destroy();
      this.DEBUGTEXT.destroy();
      if (this.circleOfInfluence) this.circleOfInfluence.destroy();
      if (this.circleAnimation) this.circleAnimation.remove();
    });

    // Create the circle of influence
    this.createCircleOfInfluence(scene, x, y, 100); // Assuming a radius of 100
  }

  createCircleOfInfluence(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number
  ) {
    this.circleOfInfluence = scene.add.graphics();
    this.circleOfInfluence.lineStyle(5, 0xffffff, 1); // Thickness, color, alpha
    this.circleOfInfluence.strokeCircle(x, y, radius);

    // Animate the circle
    this.circleAnimation = scene.tweens.add({
      targets: this.circleOfInfluence,
      alpha: 0.5, // Change the alpha to animate the circle
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  renderCircleOfInfluence(x: number, y: number) {
    if (this.circleOfInfluence) {
      this.circleOfInfluence.clear();
      this.circleOfInfluence.lineStyle(5, 0xffffff, 1);
      this.circleOfInfluence.strokeCircle(x, y, 100); // Assuming a fixed radius
    }
  }

  setPos(x: number, y: number) {
    this.setPosition(x, y);
    this.renderCircleOfInfluence(x, y);
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
    this.DEBUGTEXT.depth = -2;
    this.renderCircleOfInfluence(this.x, this.y);
  }
}
