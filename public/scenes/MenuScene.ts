import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { NetworkError, NetworkManager } from "../NetworkManager";
import { addBackgroundImage } from "../helpers/addBackgroundImage";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";

const URL = `${window.location.host}`;

export class MenuScene extends BaseScene {
  rexSpinner: SpinnerPlugin | undefined;
  constructor() {
    super(CONSTANT.SCENES.MENU);
    console.log(URL);
  }
  init() {
    super.init();
  }
  preload() {
    this.scene.bringToTop();
    this.load.html("playerForm", "../html/menu-form.html");
    this.load.image("background", "../assets/background.png");
    this.load.scenePlugin({
      key: "rexSpinner",
      url: SpinnerPlugin,
      sceneKey: "rexSpinner",
    });
  }
  create() {
    const spinner = this.rexSpinner!.add.spinner({
      width: 80,
      height: 80,
      duration: 500,
      x: 80,
      y: 80,
    });
    spinner.setDepth(9999);
    spinner.setVisible(false);
    this.AddObject(spinner, "obj_spinner");

    let networkManager = this.registry.get("networkManager") as NetworkManager;
    addBackgroundImage(this, "background");
    this.AddObject(this.add.text(100, 20, `Conquesta V1.0.1`), "obj_introText");

    this.AddObject(
      this.add.dom(600, 200).createFromCache("playerForm"),
      "obj_playerForm"
    );

    const playerForm =
      this.GetObject<Phaser.GameObjects.DOMElement>("obj_playerForm");
    if (!playerForm) {
      console.error("player form not found");
      return;
    }
    let playBtn = playerForm.getChildByName("btnJoin");
    let createSessionBtn = playerForm.getChildByName("btnCreate");
    const tutorialBtn = playerForm.getChildByName("btnTutorial");

    let playerNameInput = playerForm.getChildByName("player-name-input");
    if (networkManager.getPlayerName().length > 0)
      (playerForm.getChildByName("player-name-input") as any).value = networkManager.getPlayerName();

    playerNameInput?.addEventListener("input", (event) => {
      var inputName = <Element & { value: string }>(
        playerForm.getChildByName("player-name-input")
      );
      if (!inputName) return;
      if (inputName.value !== "") {
        let name = inputName.value.trim().replace(" ", "-");
        networkManager.setPlayerName(name);
        this.GetObject<Phaser.GameObjects.Text>("obj_introText")?.setText(
          `Welcome: ${name}`
        );
      }
    });

    tutorialBtn?.addEventListener("pointerdown", async (event) => {
      event.stopPropagation();
      this.scene.start(CONSTANT.SCENES.TUTORIAL);
    });

    playerForm.addListener("click");
    playerForm.on("click", function (event: any) {
      event.stopPropagation();
    });

    playBtn?.addEventListener("pointerdown", async (event) => {
      event.stopPropagation();
      this.scene.start(CONSTANT.SCENES.SESSIONBROWSER);
    });

    createSessionBtn?.addEventListener("pointerdown", async (event) => {
      try {
        event.stopPropagation();
        this.scene.start(CONSTANT.SCENES.SESSIONHOSTSETTINGS);
      } catch (error) {
        console.log(error);
      }
    });

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log(`[shutdown]: ${data.config.key}`);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
}
