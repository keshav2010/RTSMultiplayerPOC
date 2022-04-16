
//Establish Websocket to game server.
import {GameScene} from './scenes/GameScene';
import {MenuScene} from './scenes/MenuScene';
import {ResultScene} from './scenes/ResultScene';
import {PlayerStatisticHUD} from './scenes/PlayerStatisticHUD';

var game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1200,
    height: 600,
    scale:{
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTAL
    },
    parent:'app',
    disableContextMenu: true,
    scene: [MenuScene, PlayerStatisticHUD, GameScene, ResultScene]
});
