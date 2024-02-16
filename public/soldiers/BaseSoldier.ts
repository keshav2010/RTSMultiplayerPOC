import CONSTANTS from "../constant";
import LoadingBar from "../LoadingBar";
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
    this.depth = -2;
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
  id: any;
  initialParam: any;
  color: any[];
  expectedPositionX: any;
  expectedPositionY: any;
  hp: any;
  highlightBackground: BackgroundHighlight;
  DEBUGTEXT: any;
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
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame: string | number | undefined,
    initialParam: { id?: string },
    playerId: null | string
  ) {
    super(scene, x, y, texture, frame);

    //add object to scene
    scene.add.existing(this);
    this.setInteractive();
    this.id = initialParam.id;
    this.playerId = playerId;
    scene.events.on("update", this.update, this);

    this.initialParam = initialParam || {};
    if (this.initialParam.color) {
      this.color = [...this.initialParam.color];
    } else
      this.color = [
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255,
      ];
    this.setData("health", this.initialParam.health || 25);
    this.setData("speed", this.initialParam.speed || 10);
    this.setData("damage", this.initialParam.damage || 10);
    this.setData("cost", this.initialParam.cost || 5);

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
      `${this.id.substr(0, 15)}\n health:${this.initialParam.health}`,
      { font: "12px Arial", backgroundColor: "#ffffff" }
    );
    this.DEBUGTEXT.setOrigin(0.5);

    this.on("destroy", () => {
      this.hp.destroy();
      this.highlightBackground.destroy();
      this.DEBUGTEXT.destroy();
      this.scene.registry.get("stateManager").selectedSoldiers.delete(this.id);
    });
  }
  setHealth(newHealth: number) {
    this.setData("health", newHealth);
    this.hp.currentValue = newHealth;
  }
  update(deltaTime: number) {
    this.hp.draw();
    this.highlightBackground.draw();
    this.DEBUGTEXT.setPosition(this.x, this.y + 40);
    this.DEBUGTEXT.setText(
      `${this.initialParam.currentState}\n id:${this.id.substr(
        0,
        15
      )}\n health:${this.initialParam.health}`
    );
  }
  markSelected() {
    this.scene.registry.get("stateManager").selectedSoldiers.set(this.id, this);
    this.alpha = 0.5;

    //emit scene wide event
    this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
  }
  markUnselected() {
    if (!this || !this.scene) return;
    this.scene.registry.get("stateManager")?.selectedSoldiers.delete(this.id);
    this.alpha = 1;

    //emit scene wide event
    this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
  }
}
