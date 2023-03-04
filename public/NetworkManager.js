const CONSTANT = require('./constant');
const axios = require('axios');
class NetworkManager {
    constructor(phaserGame, phaserRegistry) {
        this.socket = null;
        this.game = phaserGame;
        this.scene = phaserGame.scene;
        this.registry = phaserRegistry;

        this.registry.set('socket', null);
        this.eventHandlersBinded = false;
        this.currentActiveSession = null;
    }

    //connects to game server and launches spawn-select scene in parallel.
    connectGameServer(url, onConnectCallback, onDisconnectCallback) {
        this.socket = io(`${url}`,{
            transports: ["websocket"],
        });
        if(!this.eventHandlersBinded) {
            console.log(`binding event handlers`);
            this.bindEventHandlers(onConnectCallback, onDisconnectCallback);
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

    bindEventHandlers(onConnectCallback, onDisconnectCallback) {
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
            if(onConnectCallback)
                onConnectCallback();
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
            if(onDisconnectCallback)
                onDisconnectCallback();
        });
    }

    sendEventToServer(eventType, data) {
        this.socket.emit(eventType, data);
    }

    async getAvailableSession() {
        let session = await axios.get('/sessions?limit=1');
        return session.data;
    }
    async hostSession() {
        let session = await axios.post('/session');
        this.currentActiveSession = session.data || null;
        return this.currentActiveSession;
    }
}
module.exports = NetworkManager;