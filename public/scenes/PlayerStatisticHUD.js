const CONSTANT = require("../constant");
import { BaseScene } from "./BaseScene";
const PacketType = require("../../common/PacketType");

export class PlayerStatisticHUD extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.HUD_SCORE);
  }
  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("exitbutton", "../assets/exitbutton.png");
    this.scene.bringToTop();
  }
  create() {
    var gameScene = this.scene.get(CONSTANT.SCENES.GAME);
    var StateManager = this.registry.get("stateManager");
    var networkManager = this.registry.get("networkManager");

    const resourceText = this.AddObject(this.add.text(50, 50, "Resources: 0"));
    const soldierCount = this.AddObject(this.add.text(50, 100, "Soldiers: 0"));
    const Controls = this.AddObject(
      this.add.text(
        10,
        10,
        "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack"
      )
    );
    var QuitButton = this.AddObject(this.add.image(900, 70, "exitbutton"))
      .setInteractive()
      .on("pointerdown", () => {
        StateManager.clearState();
        networkManager.disconnectGameServer();
      });

    var count = 0;
    gameScene.AddSceneEvent(PacketType.ByServer.SOLDIER_CREATE_ACK,
      ({ isCreated }) => {
        if(isCreated)
          soldierCount.setText(`Soldiers: ${++count}`);
      }
    );

    gameScene.AddSceneEvent(PacketType.ByServer.PLAYER_LEFT, (data) => {
      let { playerId } = data;
      console.log(`Player ${playerId} left`); 
      let playerObject = StateManager.getPlayer(playerId);
      count = count - playerObject.getSoldiers().length;
      soldierCount.setText(`Soldiers: ${count}`);
      StateManager.removePlayer(playerId);
    });

    gameScene.AddSceneEvent(PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
      ({ type, playerId, resources }) => {
        try {
          if (StateManager.getPlayer()?.playerId === playerId)
            resourceText.setText(`Resources: ${resources.toFixed(2)}`);
          else if (!StateManager.getPlayer()) {
            resourceText.setText(`Resources: ---N/A--`);
          }
        } catch (err) {
          console.log(err);
        }
      }
    );

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
