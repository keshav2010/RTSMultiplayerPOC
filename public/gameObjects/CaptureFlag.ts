import {
  CaptureFlagState,
  CaptureFlagStatus,
} from "../../gameserver/schema/CaptureFlagState";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { SelectableSceneEntity } from "../scenes/BaseScene";
import LoadingBar from "./LoadingBar";
import Phaser from "phaser";
import CONSTANTS from "../constant";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 1,
  fontSize: 18,
  stroke: "#000000",
  wordWrap: {
    width: 120,
  },
};

export class CaptureFlag
  extends Phaser.GameObjects.Sprite
  implements SelectableSceneEntity
{
  player: PlayerState;
  hp?: LoadingBar;
  debugText?: Phaser.GameObjects.Text;
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
    this.setOrigin(0.5);
    scene.add.existing(this);
    scene.events.on("update", this.update, this);
    this.setPosition(x, y);

    if (!this.isPlaceholder) {
      this.hp = new LoadingBar(scene, this, {
        maxValue: 100,
        currentValue: flag?.health || 100,
      });
      this.debugText = scene.add.text(
        x,
        y + this.height + 5,
        `${this.player.name}`,
        textStyle
      );
    }

    this.on("destroy", () => {
      scene.events.off("update", this.update, this);
      this.hp?.destroy(true);
      this.debugText?.destroy(true);
      this.circleOfInfluence?.destroy(true);
      this.circleAnimation?.destroy();
    });
  }

  markSelected() {
    this.setScale(0.5);
    this.scene?.events?.emit(CONSTANTS.GAMEEVENTS.CAPTURE_FLAG_SELECTED, this);
  }
  markUnselected() {
    this.setAlpha(1);
    this.scene?.events?.emit(
      CONSTANTS.GAMEEVENTS.CAPTURE_FLAG_UNSELECTED,
      this
    );
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
    this.hp?.setValue(newHealth);
  }
  update() {
    this.hp?.draw();
    this.hp?.setScale(2, 2);

    this.debugText?.setDepth(2);
    this.renderCircleOfInfluence(this.x, this.y);
  }
}
