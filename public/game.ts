//Establish Websocket to game server.
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { ResultScene } from "./scenes/ResultScene";
import { SpawnSelectionScene } from "./scenes/SpawnSelectionScene";
import { PlayerStatisticHUD } from "./scenes/PlayerStatisticHUD";
import { SessionLobbyScene } from "./scenes/SessionLobbyScene";
import { SessionBrowserScene } from "./scenes/SessionBrowserScene";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";

import Phaser from "phaser";
import { TutorialScene } from "./scenes/TutorialScene";
import { SessionCreateSettingsScene } from "./scenes/SessionCreateSettingsScene";
const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: "app",
  disableContextMenu: true,
  scene: [
    MenuScene,
    SessionCreateSettingsScene,
    SessionBrowserScene,
    SessionLobbyScene,
    PlayerStatisticHUD,
    SpawnSelectionScene,
    GameScene,
    ResultScene,
    TutorialScene
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
