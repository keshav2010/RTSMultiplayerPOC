const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
export class ResultScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.RESULT)
    }
    create(){
        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.events.removeListener("shutdown");
        });
        this.events.on("destroy", () => {
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        });
    }
}