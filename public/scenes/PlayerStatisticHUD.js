const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
const PacketType = require('../../common/PacketType');
export class PlayerStatisticHUD extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.HUD_SCORE);
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.scene.bringToTop();
    }
    init(stateManager){
        console.log('Player stats hud scene init', stateManager);
        this.stateManager = stateManager;
    }
    create(){
        var gameScene = this.scene.get(CONSTANT.SCENES.GAME).scene.scene;
        console.log('game scene ', gameScene);

        const resourceText = this.add.text(50, 50, "Resources: 0");
        gameScene.events.on(PacketType.ByServer.PLAYER_RESOURCE_UPDATED, ({type, playerId, resources})=>{
            console.log(this.stateManager.getPlayer());
            if(this.stateManager.getPlayer().playerId === playerId)
                resourceText.setText(`Resources: ${(resources).toFixed(2)}`);
        });
    }
}