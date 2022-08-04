const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
const Player = require('../Player');
var $ = require('jquery')
var buttonState=false;

/**
 * This scene establish connection with game-server and is alive until socket
 * remains open. It is also responsible for launching/shutting down other game scenes
 * (such as spawn selection, gameplay) in parallel. 
 */
export class NetworkScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.NETWORKSCENE)
        this.mapWidth=CONSTANT.WIDTH;
        this.mapHeight=CONSTANT.HEIGHT;
    }

    init()
    {
        console.log('Network Scene Stated');
        var socket = this.registry.get('socket');
        var StateManager = this.registry.get('stateManager');
        socket.on('disconnect', reason => {
            console.log('socket disconnected, reason : ', reason);
            //shutdown all active scenes except network scene.
            this.game.scene.getScenes().forEach(activeScene => {
                if(activeScene === this){
                    console.log('not closing : ', activeScene.scene.key);
                    return;
                }
                console.log('closing scene ', activeScene.scene.key);
                this.scene.stop(activeScene.scene.key);
            })
            StateManager = null;
            this.registry.set('socket', null);
            this.registry.set('stateManager', null);
            this.scene.start(CONSTANT.SCENES.MENU);
        });

        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            deltaChanges.forEach(deltaUpdate=>{
                //forward event to all active scenes
                this.game.scene.getScenes().forEach( activeScene => {
                    if(activeScene !== this){
                        //console.log(`${activeScene.scene.key} emitting event : ${deltaUpdate.type} to itself`);
                        activeScene.events.emit(deltaUpdate.type, deltaUpdate);
                    }
                })
            });
        });
        this.scene.launch(CONSTANT.SCENES.SPAWNSELECTSCENE);
    }
    create(){
        this.events.on('shutdown', (data)=>{
            //console.log('shutdown ', data.config.key);
            if(this.registry.get('socket')){
                this.registry.get('socket').off('tick');
                this.registry.get('socket').off('disconnect');
            }
            this.events.removeAllListeners();
        })
    }
}