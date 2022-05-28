const CONSTANT = require('../constant');
const ClientStateManager = require('../ClientStateManager')
import {BaseScene} from './BaseScene';

export class MenuScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.MENU)
    }

    init(){
        //if previous connection exist, disconnect
        if(this.registry.get('socket')){
            this.registry.get('socket').disconnect();
            this.registry.set('socket', null);
        }
        if(this.registry.get('stateManager')){
            console.log('Clearing Prev. StateManager data');
            this.registry.get('stateManager').clearState();
            this.registry.set('stateManager', null)
        }
        this.registry.set('stateManager', new ClientStateManager());
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
    }
    create(){
        this.add.text(100, 20, "War.IO");
        this.add.image(500, 220, 'playbutton').setInteractive().on('pointerdown', 
        ()=>{
            console.log('start game');
            //this.scene.start(CONSTANT.SCENES.MATCHMAKER);
            this.scene.start(CONSTANT.SCENES.MATCHMAKER);
        })
    }
}