const CONSTANT = require("../constant");
const { PacketType } = require("../../common/PacketType");
import { BaseScene } from "./BaseScene";
const { Column } = require("phaser-ui-tools");
const Player = require("../Player");
const {PlayerCastle} = require('../gameObjects/playerCastle');
var $ = require("jquery");
const LoadingBar = require("../LoadingBar");

var StateManager;
var NetworkManager;
var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace = null;
var buttonState = false;
var cursors;

export class SpawnSelectionScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.SPAWNSELECTSCENE);
    this.mapWidth = 3500;
    this.mapHeight = 1500;

    this.PlayerSpawnPointsTracker = {};
  }

  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("knight", "../assets/knight.png");
    this.load.image("spearman", "../assets/spearman.png");
    this.load.image("map", "../assets/map.png");
    this.load.image("flag", "../assets/flag.png");
  }
  create() {
    StateManager = this.registry.get("stateManager");
    NetworkManager = this.registry.get("networkManager");

    NetworkManager.sendEventToServer(PacketType.ByClient.SPAWN_POINT_REQUESTED,
      {
        spawnX: 800*Math.random() + Math.random()*400,
        spawnY: 800*Math.random() + Math.random()*400,
      }
    );

    // NetworkManager.sendEventToServer(PacketType.ByClient.CLIENT_INIT_REQUESTED);
    this.playerReadyStatus = this.AddObject(new Column(this, 0, 120));
    selectorGraphics = this.AddObject(this.add.graphics());
    selectorGraphics.clear();

    this.timerBar = this.AddObject(new LoadingBar(this, this, {
      x: 250,
      y: 150,
      maxValue: 5,
      currentValue: 5,
      width: 500,
      height: 30,
    }));

    this.AddInputEvent("pointerdown", function (pointer) {
      if (pointer.button === 0) {
        selectorGraphics.clear();
        selectorDraw = true;
        pointerDownWorldSpace = {
          x: pointer.worldX,
          y: pointer.worldY,
        };
      } else if (pointer.button === 1) {
        //mmb
        //middle mouse btn press => create spawn point
        NetworkManager.sendEventToServer(
          PacketType.ByClient.SPAWN_POINT_REQUESTED,
          {
            spawnX: pointer.worldX,
            spawnY: pointer.worldY,
          }
        );
      }
    });
    this.AddInputEvent("pointerup", function (pointer) {
      selectorDraw = false;
      selectorGraphics.clear();
      pointerDownWorldSpace = null;
    });
    this.AddInputEvent("pointermove", function (pointer) {
      if (!pointer.isDown) {
        selectorGraphics.clear();
        return;
      }
      if (selectorDraw && pointer.button === 0) {
        selectorGraphics.clear();
        selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

        let rect = new Phaser.Geom.Rectangle(
          pointerDownWorldSpace.x,
          pointerDownWorldSpace.y,
          pointer.worldX - pointerDownWorldSpace.x,
          pointer.worldY - pointerDownWorldSpace.y
        );
        if (rect.width < 0) {
          rect.x += rect.width;
          rect.width = Math.abs(rect.width);
        }
        if (rect.height < 0) {
          rect.y += rect.height;
          rect.height = Math.abs(rect.height);
        }
        selectorGraphics.strokeRectShape(rect);

        //for every sprite belonging to this player, check if it overlaps with rect
        let soldiers = StateManager.getPlayer().getSoldiers();

        soldiers.forEach((soldier) => {
          let bound = soldier.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)) {
            soldier.markSelected();
          } else {
            soldier.markUnselected();
          }
        });
      } else if (pointer.button === 2 && pointer.isDown) {
        //mmb down
        this.cameras.main.scrollX -=
          (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -=
          (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    this.AddSceneEvent(PacketType.ByServer.SPAWN_POINT_ACK,
      ({ spawnX, spawnY, playerId }) => {
        //show new choice on map for player
        let player = StateManager.getPlayer(playerId);
        player.setSpawnPoint(spawnX, spawnY);
        
        //if castle already created, just change its position.
        if(this.PlayerSpawnPointsTracker[playerId]){
          this.PlayerSpawnPointsTracker[playerId].spawnPoint.setPos(spawnX, spawnY);
          return;
        }

        // spawn a castle.
        let spawnPointFlag = this.AddObject(new PlayerCastle(
          this,
          spawnX,
          spawnY,
          "flag",
          null,
          {
            health: 0,
            player: StateManager.getPlayer(playerId)
          }
        ));
        this.PlayerSpawnPointsTracker[playerId] = { spawnPoint: spawnPointFlag, spawnX, spawnY };
      }
    );
    this.AddSceneEvent(PacketType.ByServer.COUNTDOWN_TIME, (data) => {
      let { time } = data;
      if (this.timerBar)
        this.timerBar.setValue(time);
      if (time === 0) {
        this.scene.start(CONSTANT.SCENES.GAME);
      }
    });

    this.cameras.main
      .setBounds(0, 0, this.mapWidth, this.mapHeight)
      .setName("WorldCamera");
    var mapGraphics = this.AddObject(this.add.graphics());
    mapGraphics.depth = -5;
    mapGraphics.fillStyle(0x221200, 1);
    mapGraphics.fillRect(0, 0, this.mapWidth, this.mapHeight);

    cursors = this.input.keyboard.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      drag: 0.001,
      acceleration: 0.02,
      maxSpeed: 1.0,
    };
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );
    this.AddSceneEvent("wheel", (pointer, gameobjects, deltaX, deltaY, deltaZ) => {
      this.cameras.main.setZoom(
        Math.max(0, this.cameras.main.zoom - deltaY * 0.0003)
      );
    });

    this.AddSceneEvent("shutdown", (data) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", (data) => {
      console.log("destroy scene", data.config.key);
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
  update(time, delta) {
    this.controls.update(delta);
    StateManager.update(time, delta);
    this.timerBar.draw();
  }
}
