import {
  CaptureFlagState,
  CaptureFlagStatus,
} from "../../gameserver/schema/CaptureFlagState";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import LoadingBar from "./LoadingBar";
import Phaser from "phaser";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 1,
  fontSize: 18,
  stroke: "#000000",
  wordWrap: {
    width: 120,
  },
};

export class CaptureFlag extends Phaser.GameObjects.Sprite {
  player: PlayerState;
  hp?: LoadingBar;
  DEBUGTEXT?: Phaser.GameObjects.Text;
  health: number;
  id!: string;
  flagState: CaptureFlagStatus;
  circleOfInfluence: Phaser.GameObjects.Graphics | undefined;
  circleAnimation: Phaser.Tweens.Tween | undefined;

  isPlaceholder: boolean = true;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    texture: string | Phaser.Textures.Texture,
    frame: number,
    player: PlayerState,
    flag?: CaptureFlagState | null
  ) {
    super(scene, x, y, texture, frame);

    this.isPlaceholder = flag == undefined ? true : false;
    this.flagState = flag?.flagState || CaptureFlagStatus.IN_PROGRESS;
    this.id = id;
    this.player = player;
    this.health = flag?.health || 100;
    this.setOrigin(0.5);
    scene.add.existing(this);
    scene.events.on("update", this.update, this);
    this.setPosition(x, y);

    if (!this.isPlaceholder) {
      this.hp = new LoadingBar(scene, this);
      this.DEBUGTEXT = scene.add.text(
        x + this.width,
        y + this.height * 2,
        `${this.player.name}`,
        textStyle
      );
    }

    this.on("destroy", () => {
      scene.events.off("update", this.update, this);
      this.hp?.destroy(true);
      this.DEBUGTEXT?.destroy(true);
      this.circleOfInfluence?.destroy(true);
      this.circleAnimation?.destroy();
    });
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
      this.circleOfInfluence.lineStyle(1, 0x22ffff, 1);
      this.circleOfInfluence.strokeRectShape(
        new Phaser.Geom.Rectangle(x, y, this.width, this.height)
      );
    }
  }

  setPos(x: number, y: number) {
    this.setPosition(x, y);
    this.renderCircleOfInfluence(x, y);
  }
  setHealth(newHealth: number) {
    this.health = newHealth;
    this.hp?.setValue(newHealth);
  }
  update() {
    this.hp?.draw();
    this.hp?.setScale(2, 2);
    this.hp?.setPosition(this.x + (this.width >> 1), this.y - this.height);

    this.DEBUGTEXT?.setPosition(this.x, this.y + this.height);
    this.DEBUGTEXT?.setDepth(2);
    this.renderCircleOfInfluence(this.x, this.y);
  }
}
