const CONSTANT = require("../constant");
import { BaseScene } from "./BaseScene";
const PacketType = require("../../common/PacketType");
const { Viewport, Row, Scrollbar } = require('phaser-ui-tools');
var $ = require("jquery");

export class PlayerStatisticHUD extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.HUD_SCORE);
  }
  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("exitbutton", "../assets/exitbutton.png");
    this.load.image("spearman", "../assets/spearman.png");
    this.load.image("knight", "../assets/knight.png");

    this.load.image("soldierButton", "../assets/sprite.png");
    this.load.image("track", "../assets/track.png");
    this.load.spritesheet('bar', "../assets/bar.png", { frameWidth: 44, frameHeight: 22 });
    this.scene.bringToTop();
  }
  create() {
    var gameScene = this.scene.get(CONSTANT.SCENES.GAME);
    var StateManager = this.registry.get("stateManager");
    var networkManager = this.registry.get("networkManager");

    var viewport = new Viewport(this, 125, 275, 260, 128);
    var row = new Row(this, 0, 0);
    viewport.addNode(row);

    for(let i=0; i<=10; i++) {
      let soldierButton = this.AddObject(this.add.image(0, 0, "soldierButton"));
      row.addNode(soldierButton);
    }
    var scrollbar = new Scrollbar(
      this,
      viewport,
      true,
      false,
      "track",
      "bar",
      { duration: 10, ease: Phaser.Math.Easing.Quadratic.Out }
    );
    Phaser.Display.Align.To.BottomCenter(scrollbar, viewport, 0, 128);

    const resourceText = this.AddObject(this.add.text(50, 50, "Resources: 0"));
    const soldierCount = this.AddObject(this.add.text(50, 80, "Soldiers: 0"));
    const spawnQueueText = this.AddObject(this.add.text(50, 110, ""));
    const Controls = this.AddObject(
      this.add.text(
        10,
        10,
        "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack"
      )
    );
    var QuitButton = this.AddObject(this.add.image(900, 40, "exitbutton"))
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

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
      ({ type, playerId, resources, spawnQueue }) => {
        try {
          if (StateManager.getPlayer()?.playerId === playerId)
            resourceText.setText(`Resources: ${resources.toFixed(2)}`);
          else if (!StateManager.getPlayer()) {
            resourceText.setText(`Resources: ---N/A--`);
          }
          spawnQueueText.setText(
            spawnQueue.length > 0
              ? `(${spawnQueue[0].countdown.toFixed(1)}) seconds until ${
                  spawnQueue[0].soldierType
                }-X${spawnQueue[0].count} Spawn.`
              : ""
          );
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
