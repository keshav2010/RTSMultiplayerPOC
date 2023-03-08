const CONSTANT = require("../constant");
const ClientStateManager = require("../ClientStateManager");
import { BaseScene } from "./BaseScene";
const NetworkManager = require("../NetworkManager");

export class MenuScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.MENU);
  }

  init() {
    this.mapGraphics = this.AddObject(this.add.graphics());
  }
  preload() {
    this.scene.bringToTop();
    this.load.html("playerForm", "../html/menu-form.html");
    //this.load.html("sessionCreationForm", "../html/session-create-form.html");
  }
  create() {
    this.mapGraphics.depth = -5;
    this.mapGraphics.fillStyle(0x002200, 1);
    this.mapGraphics.fillRect(0, 0, 1500, 1500);
    if (this.registry.get("stateManager")) {
      console.log("Clearing Prev. StateManager data");
      this.registry.get("stateManager").clearState();
      this.registry.set("stateManager", null);
    }
    this.registry.set("stateManager", new ClientStateManager());
    if (
      this.registry.get("networkManager") &&
      this.registry.get("networkManager").isSocketConnected()
    )
      this.registry.get("networkManager").disconnectGameServer();
    else if (!this.registry.get("networkManager"))
      this.registry.set(
        "networkManager",
        new NetworkManager(this.game, this.registry)
      );
    let networkManager = this.registry.get("networkManager");
    let text = this.AddObject(this.add.text(100, 20, "War.IO"));

    var playerForm = this.AddObject(
      this.add.dom(600, 200).createFromCache("playerForm")
    );

    /*
    var sessionCreationForm = this.AddObject(
      this.add.dom(600, 200).createFromCache("sessionCreationForm")
    )
    */
   
    let playBtn = playerForm.getChildByName("btnJoin");
    let createSessionBtn = playerForm.getChildByName("btnCreate");
    let inputField = playerForm.getChildByName("nameInput");

    inputField.addEventListener("input", (event) => {
      var inputName = playerForm.getChildByName("nameInput");
      if (inputName.value !== "") {
        let name = inputName.value.trim().replace(" ", "-");
        networkManager.setPlayerName(name);
        text.setText(`Welcome: ${name}`);
      }
    });
    playerForm.addListener("click");
    playerForm.on('click', function (event) {
      event.stopPropagation();
    });
    playBtn.addEventListener("pointerdown", async (event) => {
      event.stopPropagation();
      var inputName = playerForm.getChildByName("nameInput");
      if (inputName.value !== "") {
        let name = inputName.value.trim().replace(" ", "-");
        networkManager.setPlayerName(name);
      }
      try {
        // this.scene.start(CONSTANT.SCENES.MATCHMAKER);
        let { sessions, port } = await networkManager.getAvailableSession();
        if (!sessions || sessions.length === 0) {
          return;
        }
        let { sessionId } = sessions[0];
        const onConnectHandler = () => {
          playerForm.setVisible(false);
          playerForm.destroy();
          this.scene.start(CONSTANT.SCENES.SESSIONLOBBY, {
            sessionId,
          });
        };
        console.log("connecting to ", `localhost:${port}/${sessionId}`);
        const onDisconnectHandler = () => {
          console.log("SocketDisconnect: Launching Menu Scene");
          this.scene.start(CONSTANT.SCENES.MENU);
        };
        //join session
        this.registry
          .get("networkManager")
          .connectGameServer(
            `localhost:${port}/${sessionId}`,
            onConnectHandler,
            onDisconnectHandler
          );
      } catch (err) {
        console.error(err);
      }
    });
    createSessionBtn.addEventListener("pointerdown", async (event) => {
      event.stopPropagation();
      let { sessionId, port } = await this.registry
        .get("networkManager")
        .hostSession();

      const onConnectHandler = () => {
        this.scene.start(CONSTANT.SCENES.SESSIONLOBBY, { sessionId });
      };
      const onDisconnectHandler = () => {
        console.log("SocketDisconnect: Launching Menu Scene");
        this.scene.start(CONSTANT.SCENES.MENU);
      };
      console.log("connecting to ", `localhost:${port}/${sessionId}`);
      //join session
      this.registry
        .get("networkManager")
        .connectGameServer(
          `localhost:${port}/${sessionId}`,
          onConnectHandler,
          onDisconnectHandler
        );
    });

    this.AddSceneEvent("shutdown", (data) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
}
