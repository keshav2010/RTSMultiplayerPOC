import { PacketType } from "../../common/PacketType";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { SoldierState } from "../../gameserver/schema/SoldierState";
import { NetworkManager } from "../NetworkManager";
import CONSTANT from "../constant";
const { GAMEEVENTS } = CONSTANT;
import { PlayerCastle } from "../gameObjects/playerCastle";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import { BaseSoldier } from "../soldiers/BaseSoldier";
import { Spearman } from "../soldiers/Spearman";
import { BaseScene } from "./BaseScene";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";
import $ from "jquery";

var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace: { x: any; y: any } | null = null;
var cursors;

var networkManager: NetworkManager;
const SendChatMessage = () => {
  try {
    var messageText = $("#chat-message").val();
    networkManager.sendEventToServer(PacketType.ByClient.CLIENT_SENT_CHAT, {
      message: messageText,
    });
  } catch (err) {
    console.error(err);
  }
};
const addNewChatMessage = (msg: string, sender: string) => {
  let msgBlock = `<div>
        <div class="d-flex justify-content-between">
            <p class="small mb-1">${sender}</p>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <div>
                <p style="background-color: #f5f6f7;">
                    ${msg}
                </p>
            </div>
        </div>
    </div>`;
  $(".chat-body").append(msgBlock);
};
$(() => {
  $("#send-chat-btn").on("click", function () {
    SendChatMessage();
  });
});

type soldierIdToPhaserMap = Map<string, BaseSoldier>;
type PlayerId = string;


export const Textures = {
  PLAY_BUTTON: "playbutton",
  EXIT_BUTTON: "exitbutton",
  SOLDIER_BUTTON: "soldierbutton",
  TRACK: "track",
  KNIGHT: "knight",
  SPEARMAN: "spearman",
  CASTLE: "castle",
  GROUNDTILES: "groundtiles",
  CAPTUREFLAG: "captureFlag",
  CAPTUREFLAG_BUTTON: "img_captureFlagButton"
} as const;

export const DataKey = {
  SELECTED_SOLDIERS_MAP: 'selectedSoldiersMap',
  SOLDIERS_PHASER_OBJECTS: 'playerSoldiersGameObject',
  TILEMAP: 'map1',
  SHOW_CAPTURE_FLAG_PLACEHOLDER: 'showCaptureFlagPlaceholder'
}

enum PointerMode {
  DEFAULT = "default",
  FLAG_PLACEMENT = "flagPlacementMode",
}

interface IPointerModeAction {
  [key: string]: {
    [key: string]: (
      scene: GameScene,
      pointer: Phaser.Input.Pointer
    ) => void
  }
}

const PointerModeAction: IPointerModeAction = {
  [PointerMode.DEFAULT]: {
    pointerdown: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
        "obj_selectorGraphics"
      );

      const selectedSoldiersMap = scene.data.get(
        DataKey.SELECTED_SOLDIERS_MAP
      ) as Map<string, BaseSoldier>;

      if (!selectorGraphics) {
        return;
      }
      if (pointer.button === 0) {
        //lmb
        selectorGraphics.clear();
        selectedSoldiersMap.clear();

        selectorDraw = true;
        pointerDownWorldSpace = {
          x: pointer.worldX,
          y: pointer.worldY,
        };
      }
      //mmb
      else if (pointer.button === 1) {
        networkManager.sendEventToServer(
          PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
          {
            soldierType: "SPEARMAN",
          }
        );
      } else if (pointer.button === 2) {
        //if any soldier selected
        if (selectedSoldiersMap.size > 0) {
          const playerSoldiersGameObject = scene.data.get(
            DataKey.SOLDIERS_PHASER_OBJECTS
          ) as Map<PlayerId, soldierIdToPhaserMap>;
          const circle = new Phaser.Geom.Circle(
            pointer.worldX,
            pointer.worldY,
            16
          );
          selectorGraphics.strokeCircleShape(circle);

          const soldiers = Array.from(playerSoldiersGameObject.values()).map(
            (soldiersMap) => Array.from(soldiersMap.values())
          );

          const soldiersArray = soldiers.flat(1);

          const otherPlayerSoldiers = soldiersArray.filter(
            (d) => d.playerId !== networkManager.getClientId()
          );

          // select atmost 1 target soldier (enemy unit to be attacked)
          let targetSoldier = null;
          for (let i = 0; i < otherPlayerSoldiers.length; i++) {
            let soldier = otherPlayerSoldiers[i];
            let bound = soldier.getBounds();
            selectorGraphics.strokeRectShape(bound);
            if (Phaser.Geom.Intersects.CircleToRectangle(circle, bound)) {
              targetSoldier = soldier;
              break;
            }
          }

          //if wants to attack a soldier, mark it as target
          if (targetSoldier) {
            const selectedSoldiersForAttack = Array.from(
              selectedSoldiersMap.values()
            );
            networkManager.sendEventToServer(
              PacketType.ByClient.SOLDIER_ATTACK_REQUESTED,
              {
                soldiers: selectedSoldiersForAttack.map((v) => v.id),
                targetPlayerId: targetSoldier.playerId,
                targetUnitId: targetSoldier.id,
              }
            );
          } else {
            networkManager.sendEventToServer(
              PacketType.ByClient.SOLDIER_MOVE_REQUESTED,
              {
                soldierIds: Array.from(selectedSoldiersMap.values()).map(
                  (v) => v.id
                ),
                expectedPositionX: pointer.worldX,
                expectedPositionY: pointer.worldY,
              }
            );
          }
        }
      }
    },
    pointermove: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      const playerSoldiersGameObject = scene.data.get(
        DataKey.SOLDIERS_PHASER_OBJECTS
      ) as Map<PlayerId, soldierIdToPhaserMap>;

      const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
        "obj_selectorGraphics"
      )!;
      if (!pointer.isDown) {
        selectorGraphics.clear();
        return;
      }
      if (selectorDraw && pointer.button === 0) {
        selectorGraphics.clear();
        selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

        let rect = new Phaser.Geom.Rectangle(
          pointerDownWorldSpace?.x,
          pointerDownWorldSpace?.y,
          pointer.worldX - pointerDownWorldSpace?.x,
          pointer.worldY - pointerDownWorldSpace?.y
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
        const playerId = networkManager.getClientId();
        if (!playerId) {
          return;
        }

        const soldierMap = playerSoldiersGameObject.get(playerId);
        if (!soldierMap) {
          return;
        }
        let s = soldierMap.values();
        if (!s) {
          return;
        }
        let soldiers = [...s];
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
        scene.cameras.main.scrollX -=
          (pointer.x - pointer.prevPosition.x) / scene.cameras.main.zoom;
        scene.cameras.main.scrollY -=
          (pointer.y - pointer.prevPosition.y) / scene.cameras.main.zoom;
      }
    },
    pointerup: function (scene: GameScene, event: Phaser.Input.Pointer) {
      const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
        "obj_selectorGraphics"
      )!;
      selectorDraw = false;
      selectorGraphics.clear();
      pointerDownWorldSpace = null;
    },
    pointerout: function (scene: GameScene, event: Phaser.Input.Pointer) {},
  },
  [PointerMode.FLAG_PLACEMENT]: {
    pointerdown: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      const buttonPressed = pointer.button;
      if (buttonPressed !== 0) {
        scene.data.set(DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER, {
          visibility: false,
        });
        scene.AddObject(scene.add.particles(pointer.worldX, pointer.worldY));
        return;
      }
      networkManager.sendEventToServer(
        PacketType.ByClient.CAPTURE_FLAG_CREATE_REQUESTED,
        {
          x: pointer.worldX,
          y: pointer.worldY,
        }
      );
    },
    pointerup: function (scene: GameScene, pointer: Phaser.Input.Pointer) {},
    pointerout: function (scene: GameScene, pointer: Phaser.Input.Pointer) {},
    pointermove: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      scene
        .GetObject<Phaser.GameObjects.Sprite>("obj_captureFlagPlaceholder")
        ?.setPosition(pointer.worldX, pointer.worldY);
    },
  },
};


export class GameScene extends BaseScene {
  canvasWidth: number;
  canvasHeight: number;
  controls?: Phaser.Cameras.Controls.SmoothedKeyControl;
  rexSpinner: SpinnerPlugin.Spinner | undefined;
  
  pointerMode : PointerMode = PointerMode.DEFAULT;
  constructor() {
    super(CONSTANT.SCENES.GAME);
    this.canvasWidth = 1962;
    this.canvasHeight = 1962;
  }

  preload() {
    this.data.set(DataKey.SELECTED_SOLDIERS_MAP, new Map<string, BaseSoldier>());
    this.data.set(
      DataKey.SOLDIERS_PHASER_OBJECTS,
      new Map<PlayerId, soldierIdToPhaserMap>()
    );
    this.load.image(Textures.PLAY_BUTTON, "../assets/playbutton.png");
    this.load.image(Textures.KNIGHT, "../assets/knight.png");
    this.load.image(Textures.SPEARMAN, "../assets/spearman.png");
    this.load.image(Textures.CASTLE, "../assets/castle.png");
    this.load.image(Textures.GROUNDTILES, "../assets/groundtiles.png");
    this.load.image(Textures.CAPTUREFLAG, "../assets/captureFlag.png");
  }

  onSoldierAdded(soldier: SoldierState, ownerPlayer: PlayerState) {
    const spearmen = new Spearman(
      this,
      soldier.id,
      soldier.currentPosition.x,
      soldier.currentPosition.y,
      Textures.SPEARMAN,
      null,
      new Phaser.Math.Vector3(
        ownerPlayer.color.x,
        ownerPlayer.color.y,
        ownerPlayer.color.z
      ),
      ownerPlayer.id
    );
    const playerSoldiersGameObject = this.data.get(
      DataKey.SOLDIERS_PHASER_OBJECTS
    ) as Map<PlayerId, soldierIdToPhaserMap>;

    let soldiersMap = playerSoldiersGameObject.get(soldier.playerId);
    if (!soldiersMap) {
      playerSoldiersGameObject.set(
        soldier.playerId,
        new Map<string, BaseSoldier>()
      );
      soldiersMap = playerSoldiersGameObject.get(soldier.playerId);
    }
    soldiersMap!.set(soldier.id, spearmen);
  }

  onSoldierRemoved(soldierId: string, playerId: string) {
    try {
      this.DestroyStateChangeListener(soldierId);
      const selectedSoldiersMap = this.data.get(DataKey.SELECTED_SOLDIERS_MAP) as Map<
        string,
        BaseSoldier
      >;
      const playerSoldiersGameObject = this.data.get(
        DataKey.SOLDIERS_PHASER_OBJECTS
      ) as Map<PlayerId, soldierIdToPhaserMap>;

      selectedSoldiersMap.delete(soldierId);
      const obj = playerSoldiersGameObject.get(playerId)!.get(soldierId)!;
      this.DestroyObject(obj);
      playerSoldiersGameObject.get(playerId)!.delete(soldierId);

      console.log(
        `Removed Soldier from scene : ${soldierId} , for player : ${playerId}`
      );
    } catch (error) {
      console.log(error);
    }
  }

  onSoldierSelected(soldierId: string) {
    const playerId = networkManager.getClientId();
    if (!playerId) {
      return;
    }
    const selectedSoldiersMap = this.data.get(DataKey.SELECTED_SOLDIERS_MAP);
    const playerSoldiersGameObject = this.data.get(
      DataKey.SOLDIERS_PHASER_OBJECTS
    ) as Map<PlayerId, soldierIdToPhaserMap>;

    const soldierPhaserObj = playerSoldiersGameObject
      .get(playerId)
      ?.get(soldierId);
    if (!soldierPhaserObj) return;
    selectedSoldiersMap.set(soldierId, soldierPhaserObj);
  }

  onSoldierUnselected(soldierId: string) {
    const selectedSoldiersMap = this.data.get(DataKey.SELECTED_SOLDIERS_MAP);
    selectedSoldiersMap.delete(soldierId);
  }

  onSoldierPositionChanged(playerId: string, soldierId: string) {
    const playerSoldiersGameObject = this.data.get(
      DataKey.SOLDIERS_PHASER_OBJECTS
    ) as Map<PlayerId, soldierIdToPhaserMap>;

    const phaserSceneObject = playerSoldiersGameObject
      .get(playerId)
      ?.get(soldierId);
    const state = networkManager.getState();
    if (!state) return;
    const playerState = SessionStateClientHelpers.getPlayer(state, playerId);

    if (!playerState) {
      return;
    }

    const soldierState = SessionStateClientHelpers.getSoldier(
      state,
      playerState,
      soldierId
    );

    if (!soldierState) return;

    if (!phaserSceneObject) {
      console.error(
        `No Phaser Object Found (soldier: ${soldierId})/ playerId: ${playerId}`
      );
      return;
    }

    phaserSceneObject.setServerPosition(
      soldierState.currentPosition.x,
      soldierState.currentPosition.y
    );
  }

  onSoldierHealthUpdate(
    soldier: SoldierState,
    value: number,
    prevValue: number
  ) {
    const playerSoldiersGameObject = this.data.get(
      DataKey.SOLDIERS_PHASER_OBJECTS
    ) as Map<PlayerId, soldierIdToPhaserMap>;

    playerSoldiersGameObject
      .get(soldier.playerId)
      ?.get(soldier.id)
      ?.setHealth(value);
  }

  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;
    const GameSessionState = networkManager.getState();

    if (!GameSessionState) {
      networkManager.disconnectGameServer();
      return;
    }

    const parsedMap = networkManager.getMapData();
    if (!parsedMap) {
      console.error("Failed to parse map");
      networkManager.disconnectGameServer();
      return;
    }
    const tilemap = networkManager.getState()!.tilemap;
    const map = this.setupSceneTilemap(
      parsedMap!,
      tilemap.tileheight,
      tilemap.tilemapHeight
    );
    this.data.set(DataKey.TILEMAP, map);

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

    const stylus = this.add.graphics();
    stylus.setDepth(9999);

    const debug_painter = this.add.graphics();
    debug_painter.setDepth(10000);
    this.AddObject(stylus, "obj_selectorGraphics");
    this.AddObject(debug_painter, "obj_brush");

    this.data.set("map1", map);

    networkManager.room?.onLeave((code) => {
      console.log(`Disconnecting [code: ${code}]`);
      this.scene.stop(CONSTANT.SCENES.HUD_SCORE);
      this.scene.start(CONSTANT.SCENES.MENU);
    });

    this.AddInputEvent("pointerdown", (pointer: Phaser.Input.Pointer) => {
      PointerModeAction[this.pointerMode]['pointerdown'](this, pointer);
    });

    this.AddInputEvent("pointerup", (pointer: Phaser.Input.Pointer) => {
      PointerModeAction[this.pointerMode]['pointerup'](this, pointer);
    });

    this.AddInputEvent("pointermove", (pointer: any) => {
      PointerModeAction[this.pointerMode]['pointermove'](this, pointer);
    });

    this.scene.launch(CONSTANT.SCENES.HUD_SCORE);

    this.cameras.main
      .setBounds(
        -this.canvasWidth / 2,
        -this.canvasHeight / 2,
        this.canvasWidth * 2,
        this.canvasHeight * 2
      )
      .setName("WorldCamera");
    this.cameras.main.setBackgroundColor("rgba(255,255,255,0.3)");

    cursors = this.input.keyboard?.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors?.left,
      right: cursors?.right,
      up: cursors?.up,
      down: cursors?.down,
      drag: 0.001,
      acceleration: 0.02,
      maxSpeed: 1.0,
    };
    const cameraControl = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );
    this.AddObject(cameraControl, "obj_cameraControl");

    this.AddSceneEvent(
      PacketType.ByServer.NEW_CHAT_MESSAGE,
      (data: { message: string; sender: string }) => {
        const { message, sender } = data;
        addNewChatMessage(message, sender);
      }
    );

    this.AddObject<Phaser.GameObjects.Sprite>(
      this.add.sprite(0, 0, Textures.CAPTUREFLAG).setVisible(false),
      "obj_captureFlagPlaceholder"
    );
    
    this.data.events.on(`setdata-${DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER}`,
      (_parent: any, value: { visibility: boolean }) => {
        this.GetObject<Phaser.GameObjects.Sprite>(
          "obj_captureFlagPlaceholder"
        )?.setVisible(value.visibility);
      }
    );
    this.data.events.on(`changedata-${DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER}`,
      (_: any, value: any) => {

        if (value.visibility === true)
          this.pointerMode = PointerMode.FLAG_PLACEMENT;
        else this.pointerMode = PointerMode.DEFAULT;

        this.GetObject<Phaser.GameObjects.Sprite>(
          "obj_captureFlagPlaceholder"
        )?.setVisible(value.visibility);
      }
    );

    const state = networkManager.getState();
    if (!state) return;

    const player = SessionStateClientHelpers.getPlayer(
      state,
      networkManager.getClientId()!
    );
    if (!player || !networkManager.room) {
      console.error(`Client not connected to server anymore`);
      this.scene.start(CONSTANT.SCENES.MENU);
      return;
    }

    this.AddStateChangeListener(
      player!.spawnRequestQueue.onChange((item, key) => {
        this.events.emit(PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED, {
          playerId: player,
          queueSize: player.spawnRequestQueue.length,
        });
      })
    );

    this.AddStateChangeListener(
      player!.captureFlags.onAdd((newFlag) => {
        this.AddObject(
          this.add.sprite(newFlag.pos.x, newFlag.pos.y, Textures.CAPTUREFLAG),
          `obj_captureFlag_${player.id}`
        );
      })
    )

    // register soldier creation/removal listeners for eaech player.
    state.players.forEach((player) => {
      this.AddStateChangeListener(
        player.soldiers.onAdd((soldier, key) => {
          this.onSoldierAdded(soldier, player);

          // add relevant listeners for every soldier
          this.AddStateChangeListener(
            soldier.listen("health", (value, prevValue) => {
              this.onSoldierHealthUpdate(soldier, value, prevValue);
            }),
            `health-${soldier.id}`
          );

          this.AddStateChangeListener(
            soldier.currentPosition.onChange(() => {
              this.onSoldierPositionChanged(player.id, soldier.id);
            }),
            `currentPos-${soldier.id}`
          );
        })
      );

      this.AddStateChangeListener(
        player.soldiers.onRemove((soldier, key) => {
          const soldierId = soldier.id;
          // remove relevant listeners for each soldier.
          this.DestroyStateChangeListener(`health-${soldierId}`);
          this.DestroyStateChangeListener(`currentPos-${soldierId}`);

          this.onSoldierRemoved(soldierId, player.id);
        })
      );
    });

    this.AddStateChangeListener(
      state.players.onRemove((player) => {
        const kingdomId = `obj_playerCastle_${player.id}`;
        this.events.emit(PacketType.ByServer.PLAYER_LEFT, {
          playerState: player,
        });
        const castle = this.GetObject<PlayerCastle>(kingdomId);
        this.DestroyObject<PlayerCastle>(castle!);
      })
    );

    this.AddStateChangeListener(
      networkManager.getState()?.listen("sessionState", (value) => {
        if (value === "BATTLE_END_STATE") {
          this.scene.start(CONSTANT.SCENES.MENU);
        }
      })!
    );

    this.AddStateChangeListener(
      player.listen("resources", (value) => {
        this.events.emit(PacketType.ByServer.PLAYER_RESOURCE_UPDATED, {
          playerId: networkManager.getClientId()!,
          resources: value,
          resourceGrowthRate: player.resourceGrowthRateHz,
        });
      })
    );

    this.AddStateChangeListener(
      player.spawnRequestDetailMap.onAdd((item, key) => {
        this.AddStateChangeListener(
          item.onChange(() => {
            this.events.emit(
              PacketType.ByServer.SOLDIER_SPAWN_REQUEST_UPDATED,
              {
                count: item.count,
                countdown: item.countdown,
                requestId: item.requestId,
                unitType: item.unitType,
              }
            );
          }),
          `${item.requestId}`
        );
      })
    );

    this.AddStateChangeListener(
      player.spawnRequestDetailMap.onRemove((item, key) => {
        this.DestroyStateChangeListener(item.requestId);
      })
    );

    this.AddSceneEvent(GAMEEVENTS.SOLDIER_SELECTED, (d: BaseSoldier) => {
      this.onSoldierSelected(d.id);
    });

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

    //show initial spawnpoint choice on map for player
    networkManager.getState()?.players.forEach((player) => {
      const objKey = `obj_playerCastle_${player.id}`;
      this.AddObject(
        new PlayerCastle(
          this,
          player.pos.x,
          player.pos.y,
          Textures.CASTLE,
          null,
          {
            health: 500,
            player: player,
          }
        ),
        objKey
      );
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
    this.controls?.update(delta);

    const soldierPhaserObjs = <Map<PlayerId, soldierIdToPhaserMap>>(
      this.data.get(DataKey.SOLDIERS_PHASER_OBJECTS)
    );
    for (let [playerId, soldierMap] of soldierPhaserObjs) {
      for (let [soldierId, soldierPhaserObj] of soldierMap) {
        const serverPos = soldierPhaserObj.getServerPosition();
        soldierPhaserObj.setPosition(
          Phaser.Math.Linear(
            soldierPhaserObj.x,
            serverPos.x,
            BaseSoldier.LERP_RATE
          ),
          Phaser.Math.Linear(
            soldierPhaserObj.y,
            serverPos.y,
            BaseSoldier.LERP_RATE
          )
        );
      }
    }
  }
}
