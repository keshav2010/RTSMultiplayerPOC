import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { addBackgroundImage } from "../helpers/addBackgroundImage";

export class TutorialScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.TUTORIAL);
  }

  init() {
    super.init();
  }

  preload() {
    this.load.image("background2", "../assets/background2.png");
  }

  create() {
    addBackgroundImage(this, "background2");

    this.AddObject(this.add.text(100, 20, "🎓 Tutorial - How to Play", {
      fontSize: "32px",
      color: "#ffffff",
    }), "obj_title");
const tutorialText = `
🎮 Welcome to *Conquesta*!

🎯 **Objective**
- Dominate the battlefield by capturing and holding territories.
- Defeat enemy units and outmaneuver opponents to gain control of the map.

🕹️ **Controls**
- **Left Click**: Select units
- **Right Click**: Move or attack
- **WASD / Arrow Keys**: Pan the camera
- **Mouse Wheel**: Zoom in/out
- **Middle Click**: Spawn units (if allowed)

📍 **Territory Control**
- Each area on the map can be captured by moving your units into it.
- Holding a territory generates resources or provides strategic advantages.
- The more zones you control, the stronger your position.

🔧 **Gameplay**
- Use formations, flanking, and timing to outsmart your enemies.
- Create or join a multiplayer session to challenge real players.
- Position your troops wisely to control key points on the map.

💡 **Tips**
- Keep your units grouped to maximize their strength.
- Losing ground can turn the tide — hold your territory!
- Set a recognizable player name so others can identify you in-game.
`;


    this.AddObject(this.add.text(100, 100, tutorialText, {
      fontSize: "20px",
      color: "#ffffff",
      wordWrap: { width: 600 }
    }), "obj_tutorialText");

    const backButton = this.add.text(100, 500, "← Back to Menu", {
      fontSize: "24px",
      backgroundColor: "#222",
      padding: { x: 10, y: 5 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      this.scene.start(CONSTANT.SCENES.MENU);
    });

    this.AddObject(backButton, "obj_backButton");

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown tutorial: ", data.config.key);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
}
