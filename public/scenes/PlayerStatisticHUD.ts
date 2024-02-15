import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";

const { SoldierType } = require("../../common/SoldierType");
import $ from "jquery";
import { GameScene } from "./GameScene";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import { NetworkManager } from "../NetworkManager";
import { PlayerState } from "../../gameserver/schema/PlayerState";
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

    this.AddObject(this.add.image(900, 40, "exitbutton"))
      .setInteractive()
      .on("pointerdown", () => {
        networkManager.disconnectGameServer();
      });

    var count = 0;
    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_CREATE_ACK,
      ({ isCreated }: { isCreated: boolean }) => {
        if (isCreated) soldierCount.setText(`Soldiers: ${++count}`);
      }
    );
    
    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_LEFT,
      (data: { playerState: PlayerState }) => {
        const state = networkManager.getState();
        if (!state) return;
        const playerObject = SessionStateClientHelpers.getPlayer(
          state,
          data.playerState.id
        );
        if (!playerObject) {
          return;
        }
        soldierCount.setText(
          `Total Soldiers: ${[...state.players.values()].reduce((acc, curr) => {
            acc = acc + curr.soldiers.size;
            return acc;
          }, 0)}`
        );
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
      ({ playerId, resources }: { playerId: string; resources: number }) => {
        try {
          if (playerId === playerId)
            resourceText.setText(`Resources: ${resources.toFixed(2)}`);
        } catch (err) {
          console.log(err);
        }
      }
    );

    this.AddObject(this.add.text(50, 110, "Soldiers Queued: 0"), "obj_soldiersQueued");
    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED,
      ({ playerId, queueSize }: { playerId: string; queueSize: number }) => {
        this.GetObject<Phaser.GameObjects.Text>("obj_soldiersQueued")?.setText(
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
