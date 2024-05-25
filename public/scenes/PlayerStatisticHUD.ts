import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";

const { SoldierType } = require("../../common/SoldierType");
import $ from "jquery";
import { DataKey as GameSceneDataKey, GameScene, Textures } from "./GameScene";
import { NetworkManager } from "../NetworkManager";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { Spearman } from "../soldiers/Spearman";
import CONSTANTS from "../constant";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 4,
  fontSize: 16,
  stroke: "#000000",
  fontFamily: "Helvetica",
};

const tooltipTextStyle : Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#ff0",
  strokeThickness: 3,
  fontSize: 14,
  stroke: "#000000",
  wordWrap: {
    width: 250
  }
}

export class PlayerStatisticHUD extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.HUD_SCORE);
  }
  preload() {
    this.load.image(Textures.PLAY_BUTTON, "../assets/playbutton.png");
    this.load.image(Textures.EXIT_BUTTON, "../assets/exitbutton.png");
    this.load.image(Textures.DELETE_BUTTON, "../assets/deletebutton.png");
    this.load.image(Textures.SPEARMAN, "../assets/spearman.png");
    this.load.image(Textures.KNIGHT, "../assets/knight.png");
    this.load.image(Textures.SOLDIER_BUTTON, "../assets/sprite.png");
    this.load.image(Textures.TRACK, "../assets/track.png");
    this.load.image(
      Textures.CAPTUREFLAG_BUTTON,
      "../assets/newCaptureFlagButton.png"
    );
    this.load.image(Textures.CAPTUREFLAG, "../assets/captureFlag.png");

    this.load.spritesheet("bar", "../assets/bar.png", {
      frameWidth: 44,
      frameHeight: 22,
    });
    this.load.html("soldierSelectionWidget", "../html/soldier-selection.html");
    this.scene.bringToTop();
  }
  create() {
    var gameScene = this.scene.get<GameScene>(CONSTANT.SCENES.GAME);
    var networkManager = this.registry.get("networkManager") as NetworkManager;

    $("#soldierSelectionDiv #option_villager").on("click", () => {
      console.log("trying to create villager");
    });
    $("#soldierSelectionDiv #option_stoneman").on("click", () => {
      console.log("trying to create villager");
    });

    $("#soldierSelectionDiv #option_spearman").on("click", () => {
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_SPAWN_REQUESTED,
        {
          soldierType: SoldierType.SPEARMAN,
        }
      );
    });

    $("#soldierSelectionDiv #option_knight").on("click", () => {
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_SPAWN_REQUESTED,
        {
          soldierType: SoldierType.KNIGHT,
        }
      );
    });

    const resourceText = this.AddObject(
      this.add.text(10, 50, "Economy: 0", textStyle)
    );
    const soldierCount = this.AddObject(
      this.add.text(10, 80, "Soldiers: 0", textStyle)
    );
    const spawnQueueText = this.AddObject(
      this.add.text(10, 110, "", textStyle)
    );

    const Controls = this.AddObject(
      this.add.text(
        10,
        10,
        "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack",
        textStyle
      )
    );

    
    // Setup Tooltip
    const tooltip = this.AddObject(
      this.add.text(0, 0, "", tooltipTextStyle).setVisible(false),
      "text_tooltip"
    );

    const exitButton = this.addButton(
      Textures.EXIT_BUTTON,
      "obj_exitbutton",
      () => {
        networkManager.disconnectGameServer();
      },
      "Disconnect from current session"
    );
    const deleteButton = this.addButton(
      Textures.DELETE_BUTTON,
      "obj_deletebutton",
      () => {
        const gameScene = this.scene.get(CONSTANT.SCENES.GAME);
        gameScene.events.emit(CONSTANTS.GAMEEVENTS.DELETE_SELECTED_OBJECTS);
      },
      "Delete selected objects"
    );
    const captureFlagButton = this.addButton(
      Textures.CAPTUREFLAG_BUTTON,
      "obj_newCaptureFlagButton",
      (eventType: any) => {
        const buttonPressed = eventType.button;
        if (buttonPressed !== 0) {
          return;
        }
        const gameScene = this.scene.get(CONSTANT.SCENES.GAME);
        const flagPlaceholderData = gameScene.data.get(
          GameSceneDataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER
        );
        gameScene.data.set(GameSceneDataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER, {
          visibility: !(flagPlaceholderData?.visibility || false),
        });
        console.log(
          `setting flagPlaceholderData to:`,
          gameScene.data.get(GameSceneDataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER)
        );
      },
      "Create Territory Capture Flag"
    );

    Phaser.Actions.GridAlign([exitButton, captureFlagButton, deleteButton], {
      width: 640,
      cellHeight: 64,
      cellWidth: 64,
      x: 900,
      y: 50,
    });
    Phaser.Actions.GridAlign([tooltip], {
      width: 640,
      cellHeight: 64,
      cellWidth: 640,
      x: 840,
      y: 100,
    });

    // TODO: optimise
    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_CREATE_ACK,
      ({ isCreated }: { isCreated: boolean }) => {
        if (isCreated)
          soldierCount.setText(
            `Total Soldiers: ${[
              ...networkManager.getState()!.players.values(),
            ].reduce((acc, curr) => {
              acc = acc + curr.soldiers.size;
              return acc;
            }, 0)}`
          );
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_LEFT,
      (data: { playerState: PlayerState }) => {
        console.log(`Player : ${data?.playerState?.id} Dropped.`);

        const state = networkManager.getState();
        if (!state) return;
        const playerObject = data.playerState;
        if (!playerObject) {
          return;
        }

        const soldiers = gameScene.GetObjectsWithKeyPrefix<Spearman>(
          `obj_spearman_${playerObject.id}_`
        );
        soldiers.forEach((soldier) => {
          gameScene.onSoldierRemoved(soldier.id, playerObject.id);
        });

        soldierCount.setText(
          `Total Soldiers: ${[...state.players.values()].reduce((acc, curr) => {
            acc = acc + curr.soldiers.size;
            return acc;
          }, 0)}`
        );
      }
    );

    this.AddObject(
      this.add.text(50, 110, "Soldiers Queued: 0", textStyle),
      "obj_text_soldiersQueued"
    );
    this.AddObject(
      this.add.text(50, 140, "Next Spawn In: 0", textStyle),
      "obj_spawnETA"
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_SPAWN_REQUEST_UPDATED,
      ({
        requestId,
        count,
        countdown,
        unitType,
      }: {
        requestId: string;
        count: number;
        countdown: number;
        unitType: string;
      }) => {
        const textObject =
          this.GetObject<Phaser.GameObjects.Text>("obj_spawnETA");
        textObject?.setText(
          `Spawning Next In : ${Math.floor(countdown)} X${count}`
        );
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
      ({
        playerId,
        resources,
        resourceGrowthRate,
      }: {
        playerId: string;
        resources: number;
        resourceGrowthRate: number;
      }) => {
        try {
          if (playerId === playerId)
            resourceText.setText(
              `Economy: ${resources.toFixed(
                2
              )} ( change/sec: ${resourceGrowthRate.toFixed(2)})`
            );
        } catch (err) {
          console.log(err);
        }
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED,
      ({ playerId, queueSize }: { playerId: string; queueSize: number }) => {
        this.GetObject<Phaser.GameObjects.Text>(
          "obj_text_soldiersQueued"
        )?.setText(`Soldiers Queued: ${queueSize}`);
      }
    );

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }

  addButton(
    textureKey: string,
    objectName: string,
    onClick: Function,
    tooltip?: string
  ) {
    const btn = this.AddObject(this.add.image(0, 0, textureKey), objectName)
      .setInteractive()
      .on("pointerover", () => {
        this.GetObject<Phaser.GameObjects.Text>('text_tooltip')?.setText(tooltip || '');
        this.GetObject<Phaser.GameObjects.Text>('text_tooltip')?.setVisible(true);
        this.GetObject<Phaser.GameObjects.Image>(objectName)!.setScale(1.5);
      })
      .on("pointerdown", onClick)
      .on("pointerout", () => {
        this.GetObject<Phaser.GameObjects.Text>("text_tooltip")?.setText("");
        this.GetObject<Phaser.GameObjects.Text>("text_tooltip")?.setVisible(
          false
        );
        this.GetObject<Phaser.GameObjects.Image>(objectName)!.setScale(1);
      });
    return btn;
  }
}
