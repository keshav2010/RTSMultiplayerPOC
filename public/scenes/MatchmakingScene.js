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
        let text = this.AddObject(this.add.text(100, 120, "MATCHMAKING SCREEN"));
        this.AddSceneEvent('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.Destroy();
        });
        this.AddSceneEvent("destroy", () => {
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        });
        this.registry.get('networkManager').connectGameServer();
        this.scene.stop();
    }
}