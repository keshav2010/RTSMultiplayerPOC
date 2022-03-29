
class Packet
{
    //socketio's io reference
    static io;

    /**
     * @summary Create A Packet, register a callback that gets executed.
     * @param {string} type
     * @param {Object} socket
     * @param {function} packetAction 
     */
    constructor(type, socket, data, packetAction){
        this.type = type;
        this.data = data;
        this.socket = socket;
        this.stateUpdator = packetAction;
    }
    updateStateManager(stateManager){
        this.stateUpdator(this.type, this.socket, Packet.io, stateManager, this.data);
    }
}
module.exports = Packet;