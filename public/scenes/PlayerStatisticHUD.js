const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
const PacketType = require('../../common/PacketType');

var StateManager;
var socket;
export class PlayerStatisticHUD extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.HUD_SCORE);
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.scene.bringToTop();
    }
    init(){
        StateManager = this.registry.get('stateManager');
    }
    create(){
        var gameScene = this.scene.get(CONSTANT.SCENES.GAME);

        const resourceText = this.add.text(50, 50, "Resources: 0");
        const soldierCount = this.add.text(50, 100, "Soldiers: 0");
        const Controls = this.add.text(10, 10, "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack");
        var count=0;
        gameScene.events.on(PacketType.ByServer.SOLDIER_CREATE_ACK, ({isCreated})=>{
            soldierCount.setText(`Soldiers: ${++count}`);
        });
        gameScene.events.on(PacketType.ByServer.PLAYER_LEFT, (data)=>{
            console.log('player left', data);
        });
        gameScene.events.on(PacketType.ByServer.PLAYER_RESOURCE_UPDATED, ({type, playerId, resources})=>{
            
            if(StateManager.getPlayer().playerId === playerId)
                resourceText.setText(`Resources: ${(resources).toFixed(2)}`);
        });
    }
}