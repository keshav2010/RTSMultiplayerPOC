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
            console.log('menu removing old socket connection');
            this.registry.get('socket').disconnect();
            this.registry.set('socket', null);
        }
        if(this.registry.get('stateManager')){
            console.log('Clearing Prev. StateManager data');
            this.registry.get('stateManager').clearState();
            this.registry.set('stateManager', null)
        }
        this.registry.set('stateManager', new ClientStateManager());
        
        console.log('MenuScene init()');
    }
    preload(){
        console.log('preload');
        this.load.image('playbutton', "../assets/playbutton.png");
    }
    create(){
        this.add.text(100, 20, "War.IO");
        this.add.image(500, 220, 'playbutton').setInteractive().on('pointerdown', ()=>{
            console.log('start game');
            this.scene.start(CONSTANT.SCENES.MATCHMAKER);
        })
        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        })
        console.log('menu create')
    }
}