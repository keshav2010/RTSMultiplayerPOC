import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";

const { SoldierType } = require("../../common/SoldierType");
import $ from "jquery";
import { GameScene } from "./GameScene";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import { NetworkManager } from "../NetworkManager";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { BaseSoldier } from "../soldiers/BaseSoldier";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 4,
  fontSize: 16,
  stroke: "#000000",
  fontFamily: 'Helvetica',
};
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

    this.AddObject(this.add.image(900, 40, "exitbutton"))
      .setInteractive()
      .on("pointerdown", async () => {
        await networkManager.disconnectGameServer();
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

        const playerSoldiersGameObject = gameScene.data.get(
          "playerSoldiersGameObject"
        ) as Map<string, Map<string, BaseSoldier>>;
        const soldiersPhaserObjectMap = playerSoldiersGameObject.get(
          playerObject.id
        );
        soldiersPhaserObjectMap?.forEach((soldier, soldierId) => {
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
    this.AddObject(this.add.text(50, 140, "Next Spawn In: 0", textStyle), "obj_spawnETA");

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
        this.GetObject<Phaser.GameObjects.Text>("obj_text_soldiersQueued")?.setText(
          `Soldiers Queued: ${queueSize}`
        );
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
}
