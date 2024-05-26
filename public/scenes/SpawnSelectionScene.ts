import CONSTANT from "../constant";
import $ from "jquery";
import LoadingBar from "../gameObjects/LoadingBar";
import { NetworkManager } from "../NetworkManager";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";
import { PlayerCastle } from "../gameObjects/PlayerCastle";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import SAT from "sat";

var networkManager: NetworkManager;
var selectorGraphics: Phaser.GameObjects.Graphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace: any = null;
var cursors;

export class SpawnSelectionScene extends BaseScene {
  canvasWidth: number;
  canvasHeight: number;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl | undefined;
  constructor() {
    super(CONSTANT.SCENES.SPAWNSELECTSCENE);
    this.canvasWidth = 1962;
    this.canvasHeight = 1962;
  }

  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("knight", "../assets/knight.png");
    this.load.image("spearman", "../assets/spearman.png");
    this.load.image("castle", "../assets/castle.png");
    this.load.image("img_groundtiles", "../assets/groundtiles.png");
  }
  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;
    const GameSessionState = networkManager.getState();

    if (!GameSessionState) {
      networkManager.disconnectGameServer();
      return;
    }

    const parsedMap = networkManager.getMapData();
    const tilemap = GameSessionState.tilemap;
    const map = this.setupSceneTilemap(
      parsedMap!,
      tilemap.tileheight,
      tilemap.tilemapHeight
    );

    this.data.set("map1", map);

    // render tilemap with initial data
    for (
      let tileId = 0;
      tileId < GameSessionState.tilemap.ownershipTilemap1D.length;
      tileId++
    ) {
      this.updateTilemap(
        networkManager,
        GameSessionState.tilemap.ownershipTilemap1D[tileId],
        tileId
      );
    }

    // update tilemap for every tile update received.
    this.AddStateChangeListener(
      GameSessionState.tilemap.ownershipTilemap1D.onChange(
        (owner, tileIndex) => {
          this.updateTilemap(networkManager, owner, tileIndex);
        }
      )
    );

    networkManager.sendEventToServer(
      PacketType.ByClient.SPAWN_POINT_REQUESTED,
      {
        spawnX: 800 * Math.random() + Math.random() * 400,
        spawnY: 800 * Math.random() + Math.random() * 400,
      }
    );

    selectorGraphics = this.AddObject(this.add.graphics());
    selectorGraphics.clear();

    this.AddStateChangeListener(
      GameSessionState.listen("sessionState", (value) => {
        if (value === "BATTLE_STATE") {
          this.scene.start(CONSTANT.SCENES.GAME);
        }
      })!
    );
    SessionStateClientHelpers.getPlayers(GameSessionState).forEach((player) => {
      this.AddStateChangeListener(
        player.pos.onChange(() => {
          this.showSpawnFlag(
            networkManager,
            player.pos.x,
            player.pos.y,
            player.id
          );
        }),
        `${player.id}_pos_spawnFlag_update`
      );
    });

    this.AddObject(
      new LoadingBar(this, this, {
        x: 250,
        y: 150,
        maxValue: (GameSessionState.countdown || 5000) / 1000,
        currentValue: (GameSessionState.countdown || 5000) / 1000,
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
        this.showSpawnFlag(
          networkManager,
          pointer.worldX - 32,
          pointer.worldY - 32
        );
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
      .setBounds(
        -this.canvasWidth / 2,
        -this.canvasHeight / 2,
        this.canvasWidth * 2,
        this.canvasHeight * 2
      )
      .setName("WorldCamera");
    this.cameras.main.setBackgroundColor("rgba(255,255,255,0.3)");

    var mapGraphics = this.AddObject(this.add.graphics());

    mapGraphics.depth = -5;
    mapGraphics.fillStyle(0x000000, 0.2);
    mapGraphics.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

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
    this.AddInputEvent(
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

    this.AddSceneEvent(
      PacketType.ByServer.SPAWN_POINT_RJCT,
      (data: { message: any }) => {
        // TODO:console.log("spawn point request rejected", data);
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
    const GameSessionState = networkManager.getState();
    if (!GameSessionState) {
      networkManager.disconnectGameServer();
      return;
    }
    if (GameSessionState.sessionState !== "SPAWN_SELECTION_STATE") {
      return;
    }
    this.GetObject<LoadingBar>("obj_timerBar")?.setValue(
      (GameSessionState.countdown || 0) / 1000
    );
    this.controls?.update(delta);
    this.GetObject<LoadingBar>("obj_timerBar")?.draw();
  }

  showSpawnFlag(
    networkManager: NetworkManager,
    posX: number,
    posY: number,
    playerId?: string
  ) {
    try {
      //show new choice on map for player
      const clientId = playerId || networkManager.getClientId();
      if (!clientId) return;
      const GameSessionState = networkManager.getState();
      if (!GameSessionState) {
        networkManager.disconnectGameServer();
        return;
      }

      let player = SessionStateClientHelpers.getPlayer(
        GameSessionState,
        clientId
      );
      if (!player) return;

      // spawn a castle.
      const flagKey = `obj_spawnFlag_${clientId}`;
      const spawnFlag = this.GetObject<PlayerCastle>(flagKey);

      const playerState = SessionStateClientHelpers.getPlayer(
        GameSessionState,
        clientId
      );
      if (!playerState) {
        console.error("unable to find player state in spawn selection");
        return;
      }
      const x = posX || posX === 0 ? posX : player.pos.x;
      const y = posY || posY === 0 ? posY : player.pos.y;

      const sceneBoundingBox = new SAT.Box(
        new SAT.Vector(64, 64),
        this.canvasWidth - 64 * 2,
        this.canvasHeight - 64 * 2
      );
      const requestedPoint = new SAT.Vector(x - 64 / 2, y - 64 / 2);
      const pointInPolygon = SAT.pointInPolygon(
        requestedPoint,
        sceneBoundingBox.toPolygon()
      );
      if (!pointInPolygon) return;

      if (spawnFlag) {
        spawnFlag.setPosition(x, y);
        spawnFlag.setHealth(2);
      } else {
        const castle = new PlayerCastle(this, x, y, "castle", 0, playerState);
        this.AddObject(castle, flagKey);
      }
    } catch (error) {
      console.error(error);
    }
  }
}
