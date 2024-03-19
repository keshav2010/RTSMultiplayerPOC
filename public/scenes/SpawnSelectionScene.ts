import CONSTANT from "../constant";
import $ from "jquery";
import LoadingBar from "../LoadingBar";
import { NetworkManager } from "../NetworkManager";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";
import { PlayerCastle } from "../gameObjects/playerCastle";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";

var networkManager: NetworkManager;
var selectorGraphics: Phaser.GameObjects.Graphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace: any = null;
var cursors;

export class SpawnSelectionScene extends BaseScene {
  mapWidth: number;
  mapHeight: number;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl | undefined;
  constructor() {
    super(CONSTANT.SCENES.SPAWNSELECTSCENE);
    this.mapWidth = 3500;
    this.mapHeight = 1500;
  }

  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("knight", "../assets/knight.png");
    this.load.image("spearman", "../assets/spearman.png");
    this.load.image("map", "../assets/map.png");
    this.load.image("flag", "../assets/flag.png");
  }
  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;

    networkManager.sendEventToServer(
      PacketType.ByClient.SPAWN_POINT_REQUESTED,
      {
        spawnX: 800 * Math.random() + Math.random() * 400,
        spawnY: 800 * Math.random() + Math.random() * 400,
      }
    );

    selectorGraphics = this.AddObject(this.add.graphics());
    selectorGraphics.clear();

    console.log(
      "Spawn-selection-scene started",
      networkManager.getState()?.countdown,
      networkManager.getState()?.sessionState
    );

    this.AddStateChangeListener(
      networkManager.getState()?.listen("sessionState", (value) => {
        if (value === "BATTLE_STATE") {
          this.scene.start(CONSTANT.SCENES.GAME);
        }
      })!
    );

    this.AddObject(
      new LoadingBar(this, this, {
        x: 250,
        y: 150,
        maxValue: (networkManager.getState()?.countdown || 5000) / 1000,
        currentValue: (networkManager.getState()?.countdown || 5000) / 1000,
        width: 500,
        height: 30,
      }),
      "obj_timerBar"
    );

    this.AddInputEvent("pointerdown", (pointer: any) => {
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
        networkManager.sendEventToServer(
          PacketType.ByClient.SPAWN_POINT_REQUESTED,
          {
            spawnX: pointer.worldX,
            spawnY: pointer.worldY,
          }
        );

        const spawnFlag = this.GetObject<PlayerCastle>("obj_spawnFlag");

        const sessionState = networkManager.getState();
        if (!sessionState) return;
        const clientId = networkManager.getClientId();
        if (!clientId) {
          return;
        }
        const playerState = SessionStateClientHelpers.getPlayer(
          sessionState,
          clientId
        );
        if (!playerState) return;
        if (!spawnFlag) {
          this.AddObject(
            new PlayerCastle(
              this,
              pointer.worldX,
              pointer.worldY,
              "flag",
              null,
              {
                health: playerState.spawnFlagHealth,
                player: playerState,
              }
            ),
            "obj_spawnFlag"
          );
        }
      }
    });

    this.AddInputEvent("pointerup", function () {
      selectorDraw = false;
      selectorGraphics.clear();
      pointerDownWorldSpace = null;
    });

    this.AddInputEvent("pointermove", (pointer: any) => {
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
      } else if (pointer.button === 2 && pointer.isDown) {
        //mmb down
        this.cameras.main.scrollX -=
          (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -=
          (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    this.cameras.main
      .setBounds(0, 0, this.mapWidth, this.mapHeight)
      .setName("WorldCamera");

    var mapGraphics = this.AddObject(this.add.graphics());

    mapGraphics.depth = -5;
    mapGraphics.fillStyle(0x221200, 1);
    mapGraphics.fillRect(0, 0, this.mapWidth, this.mapHeight);

    cursors = this.input.keyboard?.createCursorKeys();
    if (!cursors) return;

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

    this.AddSceneEvent(
      "wheel",
      (
        pointer: any,
        gameobjects: any,
        deltaX: number,
        deltaY: number,
        deltaZ: number
      ) => {
        this.cameras.main.setZoom(
          Math.max(0, this.cameras.main.zoom - deltaY * 0.0003)
        );
      }
    );

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", (data: any) => {
      console.log("destroy scene", data.config.key);
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
  update(delta: number) {
    if (networkManager.getState()?.sessionState !== "SPAWN_SELECTION_STATE") {
      return;
    }

    this.GetObject<LoadingBar>("obj_timerBar")?.setValue(
      (networkManager.getState()?.countdown || 0) / 1000
    );
    this.controls?.update(delta);

    //show new choice on map for player
    const clientId = networkManager.getClientId();
    if (!clientId) {
      return;
    }

    const sessionState = networkManager.getState();
    if (!sessionState) return;

    let player = SessionStateClientHelpers.getPlayer(sessionState, clientId);
    if (!player) {
      return;
    }

    // spawn a castle.
    const spawnFlag = this.GetObject<PlayerCastle>("obj_spawnFlag");

    const playerState = SessionStateClientHelpers.getPlayer(
      sessionState,
      clientId
    );
    if (!playerState) {
      console.error("unable to find player state in spawn selection");
      return;
    }
    if (spawnFlag) {
      spawnFlag.setPosition(player.posX, player.posY);
      spawnFlag.setHealth(2);
    } else
      this.AddObject(
        new PlayerCastle(this, player.posX, player.posY, "flag", null, {
          health: playerState.spawnFlagHealth,
          player: playerState,
        }),
        "obj_spawnFlag"
      );

    this.GetObject<LoadingBar>("obj_timerBar")?.draw();
  }
}
