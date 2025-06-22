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
    this.load.html("tutorial-instructions", "../html/tutorial-instructions.html");
  }
  create() {
    addBackgroundImage(this, "background2");

    // Inject DOM tutorial content
    const container = this.add.dom(this.scale.width / 2, this.scale.height / 2)
      .createFromCache("tutorial-instructions");

    this.AddObject(container, "obj_tutorialText");

    // 🔗 Hook DOM Back Button
    const domBackButton = container.getChildByID("btn-back-menu");
    if (domBackButton) {
      domBackButton.addEventListener("click", () => {
        this.scene.start(CONSTANT.SCENES.MENU);
      });
    } else {
      console.warn("DOM Back to Menu button not found");
    }

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
