import Phaser from "phaser";
export default class LoadingBar extends Phaser.GameObjects.Graphics {
  width: number;
  height: number;
  parent: any;
  maxValue: number;
  currentValue: number;
  constructor(
    scene: Phaser.Scene,
    parent: any,
    args?: {
      maxValue: number;
      currentValue: number;
      x: number;
      y: number;
      width: number;
      height: number;
      depth ?: number;
    }
  ) {
    super(scene, {
      x: args?.x || parent.x,
      y: args?.y || parent.y,
    });
    this.width = args?.width || 25;
    this.height = args?.height || 4;
    scene.add.existing(this);

    this.parent = parent;
    this.maxValue = args?.maxValue || 100;
    this.currentValue = args?.currentValue || 100;
    this.setDepth(args?.depth || 1);
    this.draw();
  }
  setValue(value: number) {
    this.currentValue = Math.min(value, this.maxValue);
  }
  draw() {
    this.clear();
    this.copyPosition(this.parent);
    //  BG
    this.fillStyle(0x000000);
    this.fillRect(-10, 20, this.width, this.height);

    //  Health
    this.fillStyle(0xffffff);
    this.fillRect(-10, 20, this.width, this.height);

    // Actual health
    this.fillStyle(this.currentValue < 30 ? 0xff0000 : 0x00ff00);
    let d = (this.currentValue / this.maxValue) * this.width;
    this.fillRect(-10, 20, d, this.height);
  }
}
