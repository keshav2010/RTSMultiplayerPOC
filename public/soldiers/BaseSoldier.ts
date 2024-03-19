import CONSTANTS from "../constant";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import LoadingBar from "../LoadingBar";
import { NetworkManager } from "../NetworkManager";
const GAMEEVENTS = CONSTANTS.GAMEEVENTS;
class BackgroundHighlight extends Phaser.GameObjects.Graphics {
  parent: any;
  r: number;
  g: number;
  b: number;
  constructor(
    scene: Phaser.Scene,
    parent: any,
    r: number,
    g: number,
    b: number
  ) {
    super(scene, {
      x: parent.x,
      y: parent.y,
    });
    scene.add.existing(this);
    this.parent = parent;
    this.depth = -1;
    this.r = r;
    this.g = g;
    this.b = b;
    this.draw();
  }

  rgbToHex(r: number, g: number, b: number) {
    let componentToHex = function (c: number) {
      c = Math.floor(c);
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    };
    let res = "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    return parseInt(res);
  }
  draw() {
    this.clear();
    this.copyPosition(this.parent);
    var thickness = 17;

    var color = this.rgbToHex(this.r, this.g, this.b);
    this.lineStyle(thickness, color, 0.4);
    var radius = 15;
    this.strokeCircle(0, 0, radius);
  }
}
export class BaseSoldier extends Phaser.GameObjects.Sprite {
  id: string;
  initialParam: any;
  color: number[];
  expectedPositionX: number;
  expectedPositionY: number;
  hp: LoadingBar;
  highlightBackground: BackgroundHighlight;
  DEBUGTEXT: Phaser.GameObjects.Text;
  playerId: string | null;
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
    color: number[],
    playerId: null | string
  ) {
    super(scene, x, y, texture, frame);
    //add object to scene
    scene.add.existing(this);
    this.setInteractive();
    this.id = id;
    console.log("BASESOLDIER ", this.id);
    this.playerId = playerId;

    scene.events.on("update", this.update, this);
    this.color = color;
    this.expectedPositionX = x;
    this.expectedPositionY = y;
    this.setPosition(x, y);

    this.scale = 1;
    this.hp = new LoadingBar(scene, this);

    this.highlightBackground = new BackgroundHighlight(
      scene,
      this,
      this.color[0],
      this.color[1],
      this.color[2]
    );

    this.DEBUGTEXT = scene.add.text(
      x,
      y + 40,
      `${this.id.substr(0, 15)}\n health:0`,
      { font: "12px Arial", color: "yellow" }
    );
    this.DEBUGTEXT.setOrigin(0.5);
    this.DEBUGTEXT.depth = -2;
    this.on("destroy", () => {
      this.hp.destroy();
      this.highlightBackground.destroy();
      this.DEBUGTEXT.destroy();
      scene.events.off("update", this.update, this);
    });
  }
  setHealth(newHealth: number) {
    this.hp.currentValue = newHealth;
  }
  printDebugText() {
    const networkManager = this?.scene?.registry?.get(
      "networkManager"
    ) as NetworkManager;
    if(!networkManager) {
      console.log(
        `Could not find network-manager for soldier :${this.id}, most likely is deleted from scene (value of scene : ${this.scene})`
      );
      return;
    }

    const playerState = SessionStateClientHelpers.getPlayer(
      networkManager.getState()!,
      networkManager.getClientId()!
    );

    const soldierState = SessionStateClientHelpers.getSoldier(
      networkManager.getState()!,
      playerState!,
      this.id
    );

    this.DEBUGTEXT.setPosition(this.x, this.y + 40);
    this.DEBUGTEXT.setText(
      `${soldierState?.currentState}
      health:${this.hp.currentValue}`
    );
  }
  update(deltaTime: number) {
    this.hp.draw();
    this.highlightBackground.draw();
    this.printDebugText();
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
