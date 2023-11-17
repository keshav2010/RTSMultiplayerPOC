import { Queue } from "../Queue";

describe("Queue", () => {
  let queue: Queue<string>;
  beforeEach(() => {
    queue = new Queue<string>();
  });

  test("enqueue", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.getSize()).toBe(3);
    expect(queue.peekFront()).toBe("first");
    expect(queue.peekEnd()).toBe("third");
  });

  test("dequeue", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    queue.dequeue();
    expect(queue.getSize()).toBe(2);
    expect(queue.peekFront()).toBe("second");
    expect(queue.peekEnd()).toBe("third");
  });

  test("toArray", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.toArray()).toEqual(
      expect.arrayContaining(["first", "second", "third"])
    );
  });

  test("peekFront", () => {
    queue.enqueue("first");
    expect(queue.peekFront()).toBe("first");
    expect(queue.getSize()).toBe(1);
  });

  test("peekEnd", () => {
    queue.enqueue("first");
    expect(queue.peekEnd()).toBe("first");
    expect(queue.getSize()).toBe(1);
  });

  test("findAt", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.findAt(1)).toBe("second");
    expect(queue.findAt(3)).toBe("first");
  });

  test("removeNode", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.removeNode("second")).toBe(true);
    expect(queue.getSize()).toBe(2);
  });

  test("isEmpty", () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue("first");
    expect(queue.isEmpty()).toBe(false);
  });
});
