const LinkedList = require("dbly-linked-list");
class PendingUpdateManager
{
    constructor(maxPackets){
        this.pendingUpdates = new LinkedList();
        this.pendingServerEvents = new LinkedList();

        this.limit = maxPackets || 2000;
    }

    //queue the new request
    queueClientRequest(clientRequestData){
        if(this.pendingUpdates.getSize() === this.limit)
            return false;
        this.pendingUpdates.insert(clientRequestData);
        return true;
    }

    queueServerEvent(data){
        if(this.pendingServerEvents.getSize() === this.limit){
            console.log('--SERVER QUEUE LIMIT REACHED, PACKET WILL BE DROPPED---');
            return false;
        }
        this.pendingServerEvents.insert(data);
        return true;
    }
    getServerEvent(){
        if(!this.pendingServerEvents.getHeadNode())
            return null;
        let node = this.pendingServerEvents.getHeadNode().getData();
        this.pendingServerEvents.removeFirst();
        return node;
    }

    //retrieve oldest client pending request and remove it from queue.
    getClientRequest(){
        if(!this.pendingUpdates.getHeadNode())
            return null;
        let node = this.pendingUpdates.getHeadNode().getData();
        this.pendingUpdates.removeFirst();
        return node;
    }
}
module.exports = PendingUpdateManager;