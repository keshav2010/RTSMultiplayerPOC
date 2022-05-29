const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
const Player = require('../Player');
var $ = require('jquery')
var buttonState=false;

var socket;
const ClientStateManager = require('../ClientStateManager');
var StateManager;

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

        //all events are forwarded to active scene
        this.currentActiveScene=null;
    }

    init()
    {
        console.log('Network Scene Stated');
        socket = this.registry.get('socket');
        StateManager = this.registry.get('stateManager');

        this.currentActiveScene = CONSTANT.SCENES.SPAWNSELECTSCENE
        socket.on('disconnect', reason => {
            this.scene.stop(CONSTANT.SCENES.GAME);
            this.scene.stop(CONSTANT.SCENES.SPAWNSELECTSCENE);
            StateManager = null;
            this.registry.set('socket', null);
            this.scene.start(CONSTANT.SCENES.MENU);
        });

        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            deltaChanges.forEach(deltaUpdate=>{

                //forward event to all active scenes
                this.game.scene.getScenes().forEach( activeScene => {
                    if(activeScene !== this)
                        activeScene.events.emit(deltaUpdate.type, deltaUpdate);
                    else
                        console.log('NetworkScene skipping sending event to itself');
                })
                /*
                if(this.currentActiveScene)
                    this.scene.get(this.currentActiveScene).events
                    .emit(deltaUpdate.type, deltaUpdate);
                else
                    this.events.emit(deltaUpdate.type, deltaUpdate);
                */
            });
        });
        /*
        this.scene.events.on('switchActiveScene', (data)=>{
            this.currentActiveScene = data.activeScene
        })
        */
        this.scene.launch(this.currentActiveScene);
    }
}