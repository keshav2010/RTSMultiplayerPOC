import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { NetworkManager } from "../NetworkManager";
import { addBackgroundImage } from "../helpers/addBackgroundImage";
const URL = `${process.env.COLYSEUS_SERVER_URL}`;
export class MenuScene extends BaseScene {
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
  }
  create() {
    let networkManager = this.registry.get("networkManager") as NetworkManager;
    this.AddObject(this.add.text(100, 20, "War.IO"), "obj_introText");
    addBackgroundImage(this, "background");

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
    let inputField = playerForm.getChildByName("nameInput");

    inputField?.addEventListener("input", (event) => {
      var inputName = playerForm.getChildByName("nameInput") as Element & { value: string };
      if (!inputName) return;
      if (inputName.value !== "") {
        let name = inputName.value.trim().replace(" ", "-");
        networkManager.setPlayerName(name);
        this.GetObject<Phaser.GameObjects.Text>("obj_introText")?.setText(
          `Welcome: ${name}`
        );
      }
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
      event.stopPropagation();
      await this.onCreateSessionClick();
    });

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }

  async onPlayButtonClick(buttonParentForm: Phaser.GameObjects.DOMElement) {
    const playerForm = buttonParentForm;
    const networkManager = this.registry.get(
      "networkManager"
    ) as NetworkManager;
    var inputName = playerForm.getChildByName("nameInput") as Element & { value: string };
    if (inputName?.nodeValue !== "") {
      let name = inputName?.value.trim().replace(" ", "-");
      networkManager.setPlayerName(name || "");
    }
    try {
      let rooms = await networkManager.getAvailableSession();
      if (!rooms || rooms.length === 0) {
        return;
      }
      let sessionId = rooms[0].roomId;
      const onConnectHandler = () => {
        playerForm.setVisible(false);
        playerForm.destroy();
        this.scene.start(CONSTANT.SCENES.SESSIONLOBBY, {
          sessionId,
        });
      };
      const onDisconnectHandler = () => {
        console.log("SocketDisconnect: Launching Menu Scene");
        this.scene.start(CONSTANT.SCENES.MENU);
      };
      //join session
      this.registry
        .get("networkManager")
        .connectGameServer(
          `${URL}/${sessionId}`,
          onConnectHandler,
          onDisconnectHandler
        );
    } catch (err) {
      console.error(err);
    }
  }

  async onJoinSessionClick() {
    try {
      const networkManager = this.registry.get(
        "networkManager"
      ) as NetworkManager;
      if (!networkManager) {
        throw new Error("NetworkManager is not defined");
      }

      const playerName = (this.GetObject<Phaser.GameObjects.DOMElement>(
        "obj_playerForm"
      )?.getChildByName("nameInput") as Element & { value: string })!.value;
      const sessions = await networkManager.getAvailableSession();
      console.log('available sessions ', sessions);
    }
    catch(error) {

    }
  }
  async onCreateSessionClick() {
    try {
      const networkManager = this.registry.get(
        "networkManager"
      ) as NetworkManager;
      if (!networkManager) {
        throw new Error("NetworkManager is not defined");
      }

      const playerName = (this.GetObject<Phaser.GameObjects.DOMElement>(
        "obj_playerForm"
      )?.getChildByName("nameInput") as Element & { value: string })!.value;
      await networkManager?.hostAndJoinSession(
        `${playerName}`
      );

      console.log("[client id] : ", networkManager?.getClientId());
      this.scene.start(CONSTANT.SCENES.SESSIONLOBBY);
    } catch (error) {
      console.log(error);
    }
  }
}
