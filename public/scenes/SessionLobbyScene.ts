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

    this.AddObject(
      this.add.text(50, 40, `Fetching Map...`).setScale(1.5, 1.5),
      "obj_mapLoadStatus"
    );

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

    const state = networkManager.getState();

    const playerReadyTextSpacing = 20;
    const playerReadyTextOffset =300;

    this.AddStateChangeListener(
      state?.players.onAdd((player) => {

        console.log(' Added player : ', player.id, ' name = ', player.name);
        const AlreadyJoinedPlayers = Array.from(state.players.values()).filter(
          (p) => {return p.id !== player.id}
        );

        let lastIndexAdded = 0;
        AlreadyJoinedPlayers.forEach((playerAlreadyAdded, i) => {
          const existingReadyText = this.GetObject<Phaser.GameObjects.Text>(
            `obj_text_player_joined_${playerAlreadyAdded.id}`
          );
          if (existingReadyText) return;

          const textPos = playerReadyTextOffset + playerReadyTextSpacing * i;
          this.AddObject(
            this.add.text(
              15,
              textPos,
              `${playerAlreadyAdded.name} is in Room.`
            ),
            `obj_text_player_joined_${playerAlreadyAdded.id}`
          );
          console.log('adding at pos = ', textPos, 'player = ', playerAlreadyAdded.name, ' index = ', i);
          lastIndexAdded = i;
        });
        if (this.GetObject(`obj_text_player_joined_${player.id}`)) return;

        const newTextPos = playerReadyTextOffset + playerReadyTextSpacing * (state.players.size-1)
        console.log('fresh log adding at index = ',newTextPos, ' the newly joined player');
        this.AddObject(
          this.add.text(
            15,
            newTextPos,
            `${player.name} Joined Now and is in Room.`
          ),
          `obj_text_player_joined_${player.id}`
        );
      })!
    );

    this.AddStateChangeListener(
      state?.players.onRemove((player) => {
        const text = this.GetObject<Phaser.GameObjects.Text>(
          `obj_text_player_joined_${player.id}`
        );
        this.DestroyObject(text!);
      })!
    );

    networkManager
      .fetchRoomMap()
      .then(() => {
        this.GetObject<Phaser.GameObjects.Text>("obj_mapLoadStatus")
          ?.setText(`Map Successfully Fetched.`);
        networkManager.sendEventToServer(
          PacketType.ByClient.CLIENT_MAP_LOADED,
          {
            isLoaded: true,
          }
        );
      })
      .catch((error) => {
        console.error(error);
        this.GetObject<Phaser.GameObjects.Text>("obj_mapLoadStatus")
        ?.setText(`Error fetching Scene Map.`);
        networkManager.disconnectGameServer();
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
  update(delta: number) {
    const timeLeft = Number((networkManager.room?.state.countdown || 0) / 1000);
    this.GetObject<Phaser.GameObjects.Text>("obj_countdown")?.setText(
      `Spawn Selection Starts in : ${timeLeft} Seconds (${
        networkManager?.room?.state.sessionState
      })`
    );
  }
}
