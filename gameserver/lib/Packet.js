
class Packet
{
    //socketio's io reference
    static io;

    /**
     * @summary Create A Packet, register a callback that gets executed.
     * @param {string} type
     * @param {Object} socket
     * @param {function} packetAction
     * @param {array} StateSpecificPacket
     */
    constructor(type, socket, data, packetAction, StateSpecificPacket=[]){
        this.type = type;
        this.data = data;
        this.socket = socket;
        this.stateUpdator = packetAction;
        this.StateSpecificPacket = StateSpecificPacket;
    }
    updateStateManager(stateManager){
        
        //if state-specific-packet array is provided, this packet must only update serverstate
        //for when particular state mentioned in array is active.
        if(this.StateSpecificPacket.length > 0) {
            if(this.StateSpecificPacket.includes(stateManager.stateMachine.currentState)) {
                this.stateUpdator(this.type, this.socket, Packet.io, stateManager, this.data);
            }
        }
        else
            this.stateUpdator(this.type, this.socket, Packet.io, stateManager, this.data);
    }
}
module.exports = Packet;