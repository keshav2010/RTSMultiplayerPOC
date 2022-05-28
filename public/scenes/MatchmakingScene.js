const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
var socket=null;
export class MatchmakingScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.MATCHMAKER)
    }

    init(){
        console.log('Matchmaking Scene started');
        if(this.registry.get('socket')){
            this.registry.get('socket').disconnect();
            this.registry.set('socket', null);
        } 
        socket = io();
        this.registry.set('socket', socket);

        socket.on('connect', ()=>{
            this.currentActiveScene = CONSTANT.SCENES.NETWORKSCENE;
            this.scene.launch(this.currentActiveScene);
        });
    }
    preload(){
    }
    create(){
        this.add.text(100, 120, "MATCHMAKING SCREEN");
    }
}