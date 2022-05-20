const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
export class MatchmakingScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.MATCHMAKER)
    }

    init(){
        var socket = this.registry.get('socket');
        if(socket && socket.connected)
        {
            socket.disconnect();
            socket = null;
            console.log('matchmaking disconnecting old socket')
        }
        socket = io();
        this.registry.set('socket', socket);
        socket.on('connect', ()=>{
            this.scene.start(CONSTANT.SCENES.NETWORKSCENE);
        });
        console.log('matchmaker started ' , this.registry);
    }
    preload(){
    }
    create(){
        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        })
        this.add.text(100, 120, "MATCHMAKING SCREEN");
    }
}