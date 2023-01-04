const CONSTANT = require('../constant');
import {BaseScene} from './BaseScene';
export class MatchmakingScene extends BaseScene {
    constructor() {
        super(CONSTANT.SCENES.MATCHMAKER)
    }

    create() {
        var networkManager = this.registry.get('networkManager');
        if(networkManager.isSocketConnected()) {
            console.log(`[NetworkManager - socket already connected, disconnecting.]`);
            networkManager.disconnectPreviousSession();
            return;
        }
        
        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.events.removeListener("shutdown");
        });
        this.events.on("destroy", () => {
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        });
        this.add.text(100, 120, "MATCHMAKING SCREEN");
        this.registry.get('networkManager').connectGameServer();
        this.scene.stop();
    }
}