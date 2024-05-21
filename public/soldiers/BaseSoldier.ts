import CONSTANTS from "../constant";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import LoadingBar from "../gameObjects/LoadingBar";
import SAT from "sat";
import { NetworkManager } from "../NetworkManager";
import { BackgroundHighlight } from "../gameObjects/BackgroundHighlight";
const GAMEEVENTS = CONSTANTS.GAMEEVENTS;

export class BaseSoldier extends Phaser.GameObjects.Sprite {
  readonly id: string;
  initialParam: any;
  color: Phaser.Math.Vector3;
  expectedPositionX: number;
  expectedPositionY: number;
  hp: LoadingBar;
  highlightBackground: BackgroundHighlight;
  DEBUGTEXT: Phaser.GameObjects.Text;
  playerId: string | null;
  static LERP_RATE: number = 0.2;
  debugBrush: Phaser.GameObjects.Graphics;

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
    frame: string | number | undefined,
    color: Phaser.Math.Vector3,
    playerId: null | string
  ) {
    super(scene, x, y, texture, frame);
    this.debugBrush = scene.add.graphics();
    this.debugBrush.setDepth(10);
    this.setDepth(2);
    //add object to scene
    scene.add.existing(this);
    this.setInteractive();
    this.id = id;
    this.playerId = playerId;

    scene.events.on("update", this.update, this);
    this.color = new Phaser.Math.Vector3().copy(color);
    this.expectedPositionX = x;
    this.expectedPositionY = y;
    this.setPosition(x, y);

    this.scale = 1;
    this.hp = new LoadingBar(scene, this);

    this.highlightBackground = new BackgroundHighlight(scene, this, this.color);

    this.DEBUGTEXT = scene.add.text(
      x,
      y + 40,
      `${this.id.substr(0, 15)}\nhealth:0`,
      { font: "12px Arial", color: "yellow" }
    );
    this.setOrigin(0);
    this.setServerPosition(x, y);
    this.DEBUGTEXT.setOrigin(0.5);
    this.DEBUGTEXT.setDepth(10);
    this.on("destroy", () => {
      this.hp.destroy();
      this.highlightBackground.destroy();
      this.DEBUGTEXT.destroy(true);
      this.debugBrush.destroy(true);
      scene.events.off("update", this.update, this);
    });
  }
  setHealth(newHealth: number) {
    this.hp?.setValue(newHealth);
  }
  setServerPosition(x: number, y: number) {
    this.setData("serverPosition", { x, y });
  }
  getServerPosition() {
    const data = <{ x: number; y: number }>this.getData("serverPosition");
    return new SAT.Vector(data.x, data.y);
  }
  renderDebugMarkers() {
    const networkManager = this?.scene?.registry?.get(
      "networkManager"
    ) as NetworkManager;
    if (!networkManager) {
      console.log(
        `Could not find network-manager for soldier :${this.id}, most likely is deleted from scene (value of scene : ${this.scene})`
      );
      return;
    }
    const session = networkManager.getState();
    if (!session || !this.playerId) return;

    const playerState = SessionStateClientHelpers.getPlayer(
      session,
      this.playerId
    );
    if (!playerState) return;

    // render soldier's health
    const soldierState = SessionStateClientHelpers.getSoldier(
      session,
      playerState,
      this.id
    );
    this.DEBUGTEXT.setPosition(this.x, this.y + 40);
    this.DEBUGTEXT.setText(
      `${soldierState?.currentState}
      health:${this.hp.getValue()}`
    );

    // render soldier's circular hitbox on server
    this.debugBrush.lineStyle(1, 0xff00ff, 1);
    const serverPos = this.getServerPosition();
    this.debugBrush.strokeCircle(
      serverPos.x + this.height / 2,
      serverPos.y + this.height / 2,
      this.height / 2
    );
    this.debugBrush.strokeRectShape(
      new Phaser.Geom.Rectangle(
        serverPos.x,
        serverPos.y,
        this.width,
        this.height
      )
    );

    // render soldier's expected position
    this.debugBrush.setDepth(1);
    this.debugBrush.fillStyle(0xffffff, 0.3);
    this.debugBrush.fillCircle(
      soldierState?.expectedPosition.x! + this.width / 2,
      soldierState?.expectedPosition.y! + this.width / 2,
      this.height / 4
    );

    // render line from current pos to expected pos
    this.debugBrush.lineStyle(1, 0xffffff, 0.6);
    this.debugBrush.strokeLineShape(
      new Phaser.Geom.Line(
        this.x + this.width / 2,
        this.y + this.width / 2,
        soldierState!.expectedPosition.x + this.width / 2,
        soldierState!.expectedPosition.y + this.width / 2
      )
    );

    // render soldier's search radius of size 100
    this.debugBrush.lineStyle(2, 0x883322, 0.1);
    this.debugBrush.strokeCircle(this.x, this.y, 100);
    this.debugBrush.strokeRectShape(
      new Phaser.Geom.Rectangle(this.x, this.y, 100, 100)
    );
  }

  update(deltaTime: number) {
    this.hp.draw();
    this.debugBrush.clear();
    this.highlightBackground.draw();
    this.renderDebugMarkers();
  }
  markSelected() {
    this.alpha = 0.5;

    //emit scene wide event
    this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
  }
  markUnselected() {
    if (!this || !this.scene) return;
    this.alpha = 1;

    //emit scene wide event
    this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
  }
}
