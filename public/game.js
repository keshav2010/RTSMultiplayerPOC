
//Establish Websocket to game server.
import {GameScene} from './scenes/GameScene';
import {MenuScene} from './scenes/MenuScene';
import {ResultScene} from './scenes/ResultScene';
import {SpawnSelectionScene} from './scenes/SpawnSelectionScene';
import {MatchmakingScene} from './scenes/MatchmakingScene';
import {PlayerStatisticHUD} from './scenes/PlayerStatisticHUD';
import {SessionLobbyScene} from './scenes/SessionLobbyScene';
var game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1200,
    height: 600,
    scale:{
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent:'app',
    disableContextMenu: true,
    scene: [MenuScene, SessionLobbyScene, PlayerStatisticHUD, MatchmakingScene,
        SpawnSelectionScene, GameScene, ResultScene],
    dom: {
        createContainer: true
    },
});
