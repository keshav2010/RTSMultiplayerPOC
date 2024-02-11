import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";
import { NetworkManager } from "../NetworkManager";

var networkManager: NetworkManager;
var buttonState = false;

export class SessionLobbyScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.SESSIONLOBBY);
  }

  init() {
    super.init();
  }
  preload() {
    this.scene.bringToTop();
    this.load.image("playbutton", "../assets/playbutton.png");
  }
  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;

    const sessionId = networkManager.getClientId();
    this.AddObject(
      this.add.text(
        400,
        20,
        `Session(#${sessionId?.slice(
          0,
          5
        )}...) Lobby - Waiting for Players before we start.`
      )
    );

    let startGameButton = this.AddObject(
      this.add.image(500, 120, "playbutton").setScale(0.4)
    ).setInteractive();

    const cb = networkManager.getState()?.listen("sessionState", (value) => {
      console.log("session state updated ", value)
      if(value === "SPAWN_SELECTION_STATE")
        this.scene.start(CONSTANT.SCENES.SPAWNSELECTSCENE);
    })
    if(cb)
      this.AddStateChangeListener(cb);

    this.AddObject(
      this.add.text(
        15,
        250,
        `Spawn Selection Starts in : ${
          (networkManager.room?.state.countdown || 0) / 1000
        } Seconds`
      ),
      "obj_countdown"
    );

    this.AddObject(this.add.text(15, 220, "I'm Ready!"), "obj_ready")
      .setInteractive()
      .on("pointerdown", () => {
        buttonState = !buttonState;
        this.GetObject<Phaser.GameObjects.Text>("obj_ready")?.setColor(
          buttonState ? "green" : "white"
        );
        if (buttonState)
          networkManager.sendEventToServer(PacketType.ByClient.PLAYER_READY, {
            readyStatus: true,
          });
        else
          networkManager.sendEventToServer(PacketType.ByClient.PLAYER_UNREADY, {
            readyStatus: false,
          });
      });

    networkManager.room?.state.onChange(() => {});

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
  update(delta: number) {
    const timeLeft = Number((networkManager.room?.state.countdown || 0) / 1000);
    this.GetObject<Phaser.GameObjects.Text>("obj_countdown")?.setText(
      `Spawn Selection Starts in : ${timeLeft - 1} Seconds (${
        networkManager?.room?.state.sessionState
      })`
    );
  }
}
