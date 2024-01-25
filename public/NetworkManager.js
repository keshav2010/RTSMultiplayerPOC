import * as Colyseus from "colyseus.js";
class NetworkManager {
    constructor(phaserGame, phaserRegistry) {
        this.client = new Colyseus.Client(`ws://${process.env.HOST || 'localhost'}:2567`);;
        this.room = null;

        this.game = phaserGame;
        this.scene = phaserGame.scene;
        this.registry = phaserRegistry;

        this.registry.set('socket', this.client);
        this.eventHandlersBinded = false;
        this.currentActiveSession = null;
    }

    setupRoomListener(roomEventHandlerCallback) {
        if (!this.room)
            return;
        this.room.onStateChange((state) => {
            roomEventHandlerCallback('onStateChange', state);
        });
        this.room.onMessage("*", (type, message) => {
            roomEventHandlerCallback('onMessage', { type, message });
        })
        this.room.onLeave((code) => {
            roomEventHandlerCallback('onLeave', code);
            this.disconnectGameServer();
        });
        this.room.onError((code, message) => {
            roomEventHandlerCallback('onError', { code, message });
        });
    }

    async connectGameServer(roomId, roomEventHandlerCallback) {
        const room = await this.client.joinById(roomId);
        this.room = room;
        this.setupRoomListener(roomEventHandlerCallback);
        return room;
    }

    isSocketConnected() {
        return this.room != null;
    }

    async disconnectPreviousSession() {
        if (!this.room) {
            return;
        }
        await this.room.leave();
        this.room.removeAllListeners();
        this.room = null;
    }

    async disconnectGameServer() {
        if (!this.room) {
            return;
        }
        await this.room.leave();
        this.room.removeAllListeners();
        this.room = null;
    }

    sendEventToServer(eventType, data) {
        this.room?.send(eventType, data);
    }

    setPlayerName(name) {
        this.playerName = name.trim().replace(' ', '-');
    }
    getPlayerName() {
        return this.playerName || `RandomPlayer${Math.abs(Math.random() * 1000).toFixed()}`;
    }
    async getAvailableSession(roomName) {
        let rooms = await this.client.getAvailableRooms(roomName);
        return rooms;
    }
    async hostSession(roomName) {
        if (this.room) {
            await this.disconnectGameServer();
        }
        this.room = await this.client.create(roomName || `RandomPlayer${Math.abs(Math.random() * 1000).toFixed()}'s Room`);
        this.setupRoomListener(roomEventHandlerCallback);
        console.log('joined successfully', this.room);
    }
}
module.exports = NetworkManager;