const CONSTANT = require("../constant");
const { GAMEEVENTS } = CONSTANT;
const PacketType = require("../../common/PacketType");
const { Spearman } = require("../soldiers/Spearman");
import { BaseScene } from "./BaseScene";
const SoldierType = require("../../common/SoldierType");
const { Column, Viewport, Scrollbar } = require("phaser-ui-tools");
const Player = require("../Player");
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
    this.load.image("flag", "../assets/flag.jpg");
  }
  create() {
    StateManager = this.registry.get("stateManager");
    NetworkManager = this.registry.get("networkManager");

    this.playerReadyStatus = this.AddObject(new Column(this, 0, 120));
    selectorGraphics = this.AddObject(this.add.graphics());
    selectorGraphics.clear();

    this.timerBar = this.AddObject(new LoadingBar(this, this, {
      x: 250,
      y: 150,
      maxValue: 15,
      currentValue: 15,
      width: 800,
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

    this.AddSceneEvent(PacketType.ByServer.PLAYER_INIT, (data) => {
      console.log(`[PLAYER_INIT]:`, data);
      const { playerId, players, _ } = data;
      StateManager.playerId = playerId;
      players.forEach((player) => {
        let newPlayer = new Player(player);
        StateManager.addPlayer(newPlayer);

        //emit event locally.
        this.events.emit(PacketType.ByServer.SPAWN_POINT_ACK, {
          spawnX: newPlayer.getSpawnPoint().x,
          spawnY: newPlayer.getSpawnPoint().y,
          playerId: newPlayer.playerId,
        });
      });
    });
    this.AddSceneEvent(PacketType.ByClient.PLAYER_JOINED, (data) => {
      console.log(`[PLAYER_JOINED]:`, data);
      let player = data.player;
      StateManager.addPlayer(new Player(player));
      this.playerReadyStatus.addNode(
        this.AddObject(this.add.text(150, 150, `${player.id} Joined`))
      );
    });

    this.AddSceneEvent(PacketType.ByServer.SPAWN_POINT_ACK,
      ({ spawnX, spawnY, playerId }) => {
        //remove any previous choice of this player from scene.
        if(this.PlayerSpawnPointsTracker[playerId]){
          this.DestroyObject(this.PlayerSpawnPointsTracker[playerId].phaserGroup)
          delete this.PlayerSpawnPointsTracker[playerId];
        }
        
        //show new choice on map for player
        let spawnPointFlag = this.add.image(spawnX, spawnY, "flag");
        let playerIdText = this.add.text(
            spawnX - spawnPointFlag.width,
            spawnY + spawnPointFlag.height / 2,
            playerId
          )
        let objGroup = this.AddObject(this.add.group([spawnPointFlag, playerIdText]));
        this.PlayerSpawnPointsTracker[playerId] = { phaserGroup: objGroup, spawnX, spawnY };
        let player = StateManager.getPlayer(playerId);
        player.setSpawnPoint(spawnX, spawnY);
      }
    );

    this.AddSceneEvent(PacketType.ByServer.COUNTDOWN_TIME, (data) => {
      let { time } = data;
      if (this.timerBar)
        this.timerBar.decrease(this.timerBar.currentValue - time);
      if (time === 0) {
        this.scene.start(CONSTANT.SCENES.GAME);
      }
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
    })

    //initial random position.
    NetworkManager.sendEventToServer(
      PacketType.ByClient.SPAWN_POINT_REQUESTED,
      {
        spawnX: 800*Math.random() + Math.random()*400,
        spawnY: 800*Math.random() + Math.random()*400,
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
  update(time, delta) {
    this.controls.update(delta);
    StateManager.update(time, delta);
    this.timerBar.draw();
  }
}
