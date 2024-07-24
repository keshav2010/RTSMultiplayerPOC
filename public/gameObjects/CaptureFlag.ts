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
  strokeThickness: 3,
  fontSize: 28,
  stroke: "#000000",
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
    scene.add.existing(this);
    this.setInteractive();
    scene.events.on("update", this.update, this);
    this.setPosition(x, y);

    if (!this.isPlaceholder) {
      this.hp = new LoadingBar(scene, this, {
        maxValue: 100,
        currentValue: flag?.health || 100,
      });
      this.debugText = scene.add.text(
        x - (this.width >> 1),
        y + this.height,
        `${this.player.name}`,
        textStyle
      );
      this.debugText.setOrigin(0.5, 0);
    }

    this.on("destroy", () => {
      scene.events.off("update", this.update, this);
      this.hp?.destroy(true);
      this.debugText?.destroy(true);
      this.circleOfInfluence?.destroy(true);
    });
  }

  markSelected() {
    this.setAlpha(0.5);
    this.createCircleOfInfluence(this.scene, this.x, this.y, this.width / 2); // Adjust the radius as needed
    this.scene?.events?.emit(CONSTANTS.GAMEEVENTS.CAPTURE_FLAG_SELECTED, this);
  }

  markUnselected() {
    this.setAlpha(1);
    this.circleOfInfluence?.clear();
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
    if(!this.circleOfInfluence)
      this.circleOfInfluence = scene.add.graphics();
    this.circleOfInfluence.lineStyle(3, 0xffffff);
    this.circleOfInfluence.strokeCircle(x, y, radius);
  }

  renderCircleOfInfluence(x: number, y: number) {
    if (this.circleOfInfluence) {
      this.circleOfInfluence.clear();
      this.circleOfInfluence.lineStyle(1, 0xffffff, 1);
      this.circleOfInfluence.strokeCircle(x, y, this.height / 2);
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
  }
}
