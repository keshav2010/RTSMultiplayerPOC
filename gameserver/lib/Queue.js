var LinkedList = require('dbly-linked-list');
class Queue
{
    constructor() {
        this.mList = new LinkedList();
    }
    enqueue(data) {
        this.mList.insert(data);
    }
    dequeue() {
        if(this.mList.isEmpty())
            return;
        this.mList.removeFirst();
    }
    peekFront() {
        if(this.mList.isEmpty()) return null;
        return this.mList.getHeadNode();
    }
    peekEnd() {
        if(this.mList.isEmpty()) return null;
        return this.mList.getTailNode();
    }
    toArray() {
        return this.mList.toArray();
    }
    findAt(offset) {
        if(this.mList.getSize() === 0)
            return null;
        if(offset >= this.mList.getSize() && this.mList.getSize() > 0)
            offset = offset%this.mList.getSize();
        return this.mList.findAt(offset);
    }
    removeNode(data) {
        let contains = this.mList.contains(data);
        if(contains)
            this.mList.removeNode(data);
        return contains;
    }
    isEmpty() {
        return this.mList.isEmpty();
    }
    getSize() {
        return this.mList.getSize();
    }
}
module.exports = { Queue };