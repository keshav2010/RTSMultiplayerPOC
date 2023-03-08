//Establish Websocket to game server.
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { ResultScene } from "./scenes/ResultScene";
import { SpawnSelectionScene } from "./scenes/SpawnSelectionScene";
import { PlayerStatisticHUD } from "./scenes/PlayerStatisticHUD";
import { SessionLobbyScene } from "./scenes/SessionLobbyScene";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";

const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: "app",
  disableContextMenu: true,
  scene: [
    MenuScene,
    SessionLobbyScene,
    PlayerStatisticHUD,
    SpawnSelectionScene,
    GameScene,
    ResultScene,
  ],
  dom: {
    createContainer: true,
  },
  plugins: {
    scene: [
      {
        key: "rexSpinner",
        plugin: SpinnerPlugin,
        mapping: "rexSpinner",
      },
    ],
  },
};
var game = new Phaser.Game(config);
