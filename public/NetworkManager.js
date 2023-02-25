const CONSTANT = require('./constant');
class NetworkManager {
    constructor(phaserGame, phaserRegistry, OnDisconnect = null, OnConnect = null) {
        this.socket = null;
        this.game = phaserGame;
        this.scene = phaserGame.scene;
        this.registry = phaserRegistry;

        this.registry.set('socket', null);

        this.cb_OnDisconnect = OnDisconnect;
        this.cb_OnConnect = OnConnect;
        this.eventHandlersBinded = false;
    }

    //connects to game server and launches spawn-select scene in parallel.
    connectGameServer(sessionId) {
        this.socket = io(`/${sessionId}`,{
            transports: ["websocket"],
        });
        if(!this.eventHandlersBinded) {
            console.log(`binding event handlers`);
            this.bindEventHandlers();
        }
    }

    isSocketConnected() {
        return this.socket && this.socket.connected;
    }

    disconnectPreviousSession() {
        if(this.socket && this.socket.connected)
        {
            this.socket.disconnect();
            this.socket = null;
            this.eventHandlersBinded = false;
        }
    }

    disconnectGameServer() {
        this.eventHandlersBinded = false;
        if(!this.socket) {
            console.log(`[disconnectGameServer]: socket is null already!`);
            return;
        }
        this.socket.disconnect();
        this.socket = null;
    }

    bindEventHandlers() {
        if(!this.socket) {
            console.log(`[bindEventHandlers]: socket is null.`);
            return;
        }
        this.eventHandlersBinded = true;
        this.socket.on('tick', (d) => {
            let deltaChanges = JSON.parse(d).data;
            console.log(`tick received`);
            deltaChanges.forEach(deltaUpdate => {
                this.game.scene.getScenes().forEach(activeScene => {
                    if (activeScene !== this) {
                        activeScene.events.emit(deltaUpdate.type, deltaUpdate);
                    }
                })
            });
        });
        this.socket.on('connect', () => {
            console.log('socket connect');
            if(this.cb_OnConnect)
                this.cb_OnConnect();
            this.scene.start(CONSTANT.SCENES.SPAWNSELECTSCENE);
        });
        this.socket.on('disconnect', reason => {
            console.log(`[NetworkManager] Socket Disconnect (Reason: ${reason})`);

            console.log(`Active Scenes : ${this.game.scene.getScenes().map(v => v.scene.key).join(',')}`);
            this.game.scene.getScenes().forEach(activeScene => {
                console.log(`Closing Scene : ${activeScene.scene.key}`);
                this.scene.stop(activeScene.scene.key);
                activeScene.events.emit("shutdown", activeScene.scene);
            })
            this.registry.get('stateManager').clearState();
            if(this.cb_OnDisconnect)
                this.cb_OnDisconnect();

            console.log('Launching Menu Scene since socket disconnected.', this.socket);
            this.scene.start(CONSTANT.SCENES.MENU);
        });
    }

    sendEventToServer(eventType, data) {
        this.socket.emit(eventType, data);
    }
}
module.exports = NetworkManager;