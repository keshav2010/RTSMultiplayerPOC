const CONSTANT = require("../constant");
const ClientStateManager = require("../ClientStateManager");
import { BaseScene } from "./BaseScene";
const { Column } = require("phaser-ui-tools");
const Player = require("../Player");
const PacketType = require("../../common/PacketType");

var StateManager;
var NetworkManager;
var buttonState = false;

export class SessionLobbyScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.SESSIONLOBBY);
  }

  init() {

  }
  preload() {
    this.scene.bringToTop();
    this.load.image("playbutton", "../assets/playbutton.png");
  }
  create({ sessionId }) {
    StateManager = this.registry.get("stateManager");
    NetworkManager = this.registry.get("networkManager");

    this.playerReadyStatus = this.AddObject(new Column(this, 50, 120));

    // Request Server to register this player
    NetworkManager.sendEventToServer(PacketType.ByClient.CLIENT_INIT_REQUESTED);

    let sessionLobbyText = this.AddObject(
      this.add.text(
        400,
        20,
        `Session(#${sessionId.slice(0, 5)}...) Lobby - Waiting for Players before we start.`
      )
    );

    let playBtn = this.AddObject(
      this.add.image(500, 120, "playbutton").setScale(0.4)
    ).setInteractive();

    playBtn.on("pointerdown", () => {
      this.scene.start(CONSTANT.SCENES.SPAWNSELECTSCENE);
    });

    let ReadyButton = this.AddObject(this.add.text(15, 220, "I'm Ready!")).setInteractive().on("pointerdown", () => {
      buttonState = !buttonState;
      ReadyButton.setColor(buttonState ? "green" : "white");
      if (buttonState)
        NetworkManager.sendEventToServer(
          PacketType.ByClient.PLAYER_READY,
          {}
        );
      else
        NetworkManager.sendEventToServer(
          PacketType.ByClient.PLAYER_UNREADY,
          {}
        );
    });
    this.AddSceneEvent(PacketType.ByServer.COUNTDOWN_TIME, (data) => {
      let { time } = data;
      if (time === 0) {
        this.scene.start(CONSTANT.SCENES.SPAWNSELECTSCENE);
      }
    });
    this.AddSceneEvent(PacketType.ByServer.PLAYER_INIT, (data) => {
      console.log(`[PLAYER_INIT]:`, data);
      const { playerId, players } = data;
      StateManager.playerId = playerId;
      players.forEach((player) => {
        let newPlayer = new Player(player);
        StateManager.addPlayer(newPlayer);
        /* TODO: invoke in spawn-selection-scene.
        //emit event locally.
        this.events.emit(PacketType.ByServer.SPAWN_POINT_ACK, {
          spawnX: newPlayer.getSpawnPoint().x,
          spawnY: newPlayer.getSpawnPoint().y,
          playerId: newPlayer.playerId,
        });
        */
      });
    });

    this.AddSceneEvent(PacketType.ByClient.PLAYER_JOINED, (data) => {
      console.log(`[PLAYER_JOINED]:`, data);
      let player = data.player;
      StateManager.addPlayer(new Player(player));
      this.playerReadyStatus.addNode(
        this.AddObject(this.add.text(150, 150, `${player.name} Joined`))
      );
    });

    this.AddSceneEvent(PacketType.ByClient.PLAYER_READY, (data) => {
      this.playerReadyStatus.addNode(
        this.AddObject(this.add.text(150, 150, `${data.playerId} Ready`))
      );
    });

    this.AddSceneEvent(PacketType.ByClient.PLAYER_UNREADY, (data) => {
      this.playerReadyStatus.addNode(
        this.AddObject(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
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
  update(time, delta) {
    StateManager.update(time, delta);
  }
}
