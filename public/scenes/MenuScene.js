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
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("createbutton", "../assets/createbutton.png");
  }
  create() {
    console.log("menu-scene create()");
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
    let text = this.AddObject(this.add.text(100, 20, "War.IO"));
    let playBtn = this.AddObject(
      this.add.image(500, 120, "playbutton")
    ).setInteractive();
    let createSessionBtn = this.AddObject(
      this.add.image(500, 320, "createbutton")
    ).setInteractive();
    playBtn.on("pointerdown", async () => {
      console.log("start game");
      this.scene.start(CONSTANT.SCENES.MATCHMAKER);
      let { sessions, port } = await this.registry
        .get("networkManager")
        .getAvailableSession();
      if(sessions.length === 0) {
        return;
      }

      let { sessionId } = sessions[0];
      const onConnectHandler = () => {
        this.scene.start(CONSTANT.SCENES.SESSIONLOBBY, {
          sessionId
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
    });
    createSessionBtn.on("pointerdown", async () => {
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
