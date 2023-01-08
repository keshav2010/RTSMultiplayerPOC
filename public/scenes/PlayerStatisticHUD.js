const CONSTANT = require("../constant");
import { BaseScene } from "./BaseScene";
const PacketType = require("../../common/PacketType");

export class PlayerStatisticHUD extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.HUD_SCORE);
  }
  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.scene.bringToTop();
  }
  create() {
    var gameScene = this.scene.get(CONSTANT.SCENES.GAME);
    var StateManager = this.registry.get("stateManager");

    const resourceText = this.AddObject(this.add.text(50, 50, "Resources: 0"));
    const soldierCount = this.AddObject(this.add.text(50, 100, "Soldiers: 0"));
    const Controls = this.AddObject(this.add.text(10, 10,
      "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack"
    ));

    var count = 0;
    gameScene.AddSceneEvent(PacketType.ByServer.SOLDIER_CREATE_ACK,
      ({ isCreated }) => {
        soldierCount.setText(`Soldiers: ${++count}`);
      }
    );

    gameScene.AddSceneEvent(PacketType.ByServer.PLAYER_LEFT, (data) => {
      console.log("player left", data);
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
