import LinkedList from "dbly-linked-list";
export class Queue<T extends object | number | string> {
  mList: LinkedList;
  constructor() {
    this.mList = new LinkedList();
  }
  enqueue(data: T) {
    this.mList.insert(data);
  }
  dequeue() {
    if (this.mList.isEmpty()) return;
    this.mList.removeFirst();
  }
  peekFront() {
    const headNode = this.mList.getHeadNode();
    if (this.mList.isEmpty() || !headNode) return null;
    return headNode.getData<T>();
  }
  peekEnd() {
    const tailNode = this.mList.getTailNode();
    if (this.mList.isEmpty() || !tailNode) return null;
    return tailNode.getData<T>();
  }
  toArray() {
    return this.mList.toArray().map((d) => d as T);
  }
  findAt(offset: number) {
    if (this.mList.getSize() === 0) return null;
    if (offset >= this.mList.getSize() && this.mList.getSize() > 0)
      offset = offset % this.mList.getSize();
    return this.mList.findAt(offset).getData<T>();
  }
  removeNode(data: T) {
    let contains = this.mList.contains(data);
    if (contains) this.mList.removeNode(data);
    return contains;
  }
  isEmpty() {
    return this.mList.isEmpty();
  }
  getSize() {
    return this.mList.getSize();
  }
}
