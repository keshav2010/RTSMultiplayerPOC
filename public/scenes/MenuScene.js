const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
export class MenuScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.MENU)
    }

    init(){

    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
    }
    create(){
        this.add.text(100, 20, "War.IO");
        var btn = this.add.image(500, 220, 'playbutton').setInteractive().on('pointerdown', ()=>{
            console.log('start game');
            this.scene.start(CONSTANT.SCENES.GAME);
        })
    }
}