import SAT from 'sat';
function rgbToHex(r: number, g: number, b: number) {
  let componentToHex = function (c: number) {
    c = Math.floor(c);
    var hex = c.toString(16);
    return hex.length == 1 ? `0${hex}` : hex;
  };
  return parseInt(
    `0x${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`
  );
}

export class BackgroundHighlight extends Phaser.GameObjects.Graphics {
  parent: Phaser.GameObjects.Sprite;
  parentDimension: SAT.Box;
  color: Phaser.Math.Vector3;
  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Sprite,
    color: Phaser.Math.Vector3
  ) {
    super(scene, {
      x: parent.x,
      y: parent.y,
    });
    this.parentDimension = new SAT.Box(
      new SAT.Vector(parent.x, parent.y),
      parent.width,
      parent.height
    );
    scene.add.existing(this);
    this.parent = parent;
    this.depth = 1;
    this.color = new Phaser.Math.Vector3().copy(color);
    this.alpha = 0.5;
  }

  draw() {
    this.clear();
    this.copyPosition(this.parent);
    var thickness = 1;
    this.setAlpha(0.4);
    const color = rgbToHex(this.color.x, this.color.y, this.color.z);
    const radius = this.parentDimension.w / 2;
    this.lineStyle(thickness, color);
    this.fillStyle(color, 1);
    this.fillCircle(radius, radius, radius);
  }
}
