import { PlayerState } from "../../gameserver/schema/PlayerState";
import LoadingBar from "./LoadingBar";
import Phaser from "phaser";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 3,
  fontSize: 25,
  stroke: "#000000",
  wordWrap: {
    width: 120,
  },
};

export class PlayerCastle extends Phaser.GameObjects.Sprite {
  name: string;
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
    frame: number,
    player: PlayerState
  ) {
    super(scene, x, y, texture, frame);
    this.health = player?.castleHealth || 100;
    scene.add.existing(this);
    this.setOrigin(0);
    scene.events.on("update", this.update, this);
    this.setPosition(x, y);
    this.scale = 1;
    this.hp = new LoadingBar(scene, this);
    this.name = player.name;
    this.DEBUGTEXT = scene.add.text(
      x + this.width,
      y + this.height * 2,
      `${player.name}`,
      textStyle
    );

    this.on("destroy", () => {
      scene.events.off("update", this.update, this);
      this.hp.destroy(true);
      this.DEBUGTEXT.destroy(true);
      if (this.circleOfInfluence) this.circleOfInfluence.destroy(true);
      if (this.circleAnimation) this.circleAnimation.destroy();
    });

    // Create the circle of influence
    this.createCircleOfInfluence(scene, x, y, this.height);
  }

  createCircleOfInfluence(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number
  ) {
    this.circleOfInfluence = scene.add.graphics();
    this.circleOfInfluence.lineStyle(3, 0xffffff);
    this.circleOfInfluence.strokeCircle(
      x + this.width / 2,
      y + this.height / 2,
      radius
    );

    // Animate the circle
    this.circleAnimation = scene.tweens.add({
      targets: this.circleOfInfluence,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  renderCircleOfInfluence(x: number, y: number) {
    if (this.circleOfInfluence) {
      this.circleOfInfluence.clear();
      this.circleOfInfluence.lineStyle(1, 0xffffff, 1);
      this.circleOfInfluence.strokeCircle(
        x + this.width / 2,
        y + this.height / 2,
        this.height / 2
      );
    }
  }

  setPos(x: number, y: number) {
    this.setPosition(x, y);
    this.renderCircleOfInfluence(x, y);
  }
  setHealth(newHealth: number) {
    this.health = newHealth;
    this.hp.setValue(newHealth);
  }
  update() {
    this.hp.draw();
    this.hp.setScale(2, 2);
    this.hp.setPosition(this.x + (this.width >> 1), this.y - this.height);

    this.DEBUGTEXT.setPosition(this.x, this.y + this.height);
    this.DEBUGTEXT.setText(
      `[${this.name}]\n
      ${Math.floor(this.hp.getValue())}`
    );
    this.DEBUGTEXT.depth = 2;
    this.renderCircleOfInfluence(this.x, this.y);
  }
}
