
//Establish Websocket to game server.
import {GameScene} from './scenes/GameScene';
import {MenuScene} from './scenes/MenuScene';
import {ResultScene} from './scenes/ResultScene';


var game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1600,
    height: 800,
    scale:{
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTAL
    },
    scene: [MenuScene, GameScene, ResultScene]
});
