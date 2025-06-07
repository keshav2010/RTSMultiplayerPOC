import Phaser from "phaser";

function lerpColor(a: string, b: string, t: number): string {
  // a, b: hex color strings like '#43e97b', '#ff5252'; t: 0..1
  const ah = a.startsWith('#') ? a.substring(1) : a;
  const bh = b.startsWith('#') ? b.substring(1) : b;
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
}

export default class SpawnTimerBar {
  private dom: Phaser.GameObjects.DOMElement;
  private node: HTMLElement;
  private barInner: HTMLElement;
  private countdownLabel: HTMLElement;
  private dragHandle: HTMLElement | null;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dom = scene.add.dom(scene.sys.canvas.width / 2, 60).createFromCache("spawn-timer-bar");
    this.dom.setOrigin(0.5, 0);
    this.dom.setDepth(10001);
    this.dom.setScrollFactor(0);

    this.node = this.dom.node as HTMLElement;
    // Remove fixed, use absolute and Phaser DOM x/y
    this.node.style.position = 'absolute';
    this.centerOnScreen();
    this.node.style.zIndex = '10001';

    this.barInner = this.node.querySelector('#spawn-timer-bar-inner') as HTMLElement;
    this.countdownLabel = this.node.querySelector('#spawn-timer-countdown') as HTMLElement;
    this.dragHandle = this.node.querySelector('#spawn-timer-drag-handle');

    this.initDrag();
  }

  public centerOnScreen() {
    // Center in the game canvas (like chatbox)
    const w = this.scene.sys.canvas.width;
    this.dom.x = w / 2;
    this.dom.y = 60;
    this.node.style.left = '';
    this.node.style.top = '';
    this.node.style.transform = 'translate(-50%, 0)';
  }

  private initDrag() {
    this.dragHandle?.addEventListener('mousedown', (e) => {
      const mouseEvent = e as MouseEvent;
      this.isDragging = true;
      this.dragOffsetX = mouseEvent.clientX - this.dom.x;
      this.dragOffsetY = mouseEvent.clientY - this.dom.y;
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        // Move the Phaser DOM element
        this.dom.x = e.clientX - this.dragOffsetX;
        this.dom.y = e.clientY - this.dragOffsetY;
        this.node.style.transform = 'translate(-50%, 0)';
      }
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  public update(current: number, max: number) {
    const percent = Math.max(0, Math.min(1, current / max));
    // Color: green (#43e97b) to yellow (#ffe066) to red (#ff5252)
    let colorLeft = '#43e97b';
    let colorRight = '#43e97b';
    if (percent > 0.5) {
      colorLeft = lerpColor('#ffe066', '#43e97b', (percent - 0.5) * 2); // green to yellow
      colorRight = '#43e97b';
    } else {
      colorLeft = lerpColor('#ff5252', '#ffe066', percent * 2); // yellow to red
      colorRight = lerpColor('#ffe066', '#43e97b', 0); // yellow
    }
    if (this.barInner) {
      this.barInner.style.width = `${percent * 100}%`;
      this.barInner.style.background = `linear-gradient(90deg, ${colorLeft} 0%, ${colorRight} 100%)`;
    }
    if (this.countdownLabel) this.countdownLabel.textContent = `${current.toFixed(1)}s`;
  }

  public getDom(): Phaser.GameObjects.DOMElement {
    return this.dom;
  }
} 