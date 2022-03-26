const LinkedList = require("dbly-linked-list");
//Stack based implementation (LIFO)
class PendingUpdateManager
{
    constructor(maxPackets){
        this.pendingUpdates = new Array();
        this.limit = maxPackets || 500;
    }

    //queue the new request
    queueClientRequest(clientRequestData){
        if(this.pendingUpdates.length === this.limit)
            return false;
        this.pendingUpdates.push(clientRequestData);
        return true;
    }

    //retrieve oldest client pending request and remove it from queue.
    getClientRequest(){
        let node = this.pendingUpdates.pop();
        return node;
    }
}
module.exports = PendingUpdateManager;