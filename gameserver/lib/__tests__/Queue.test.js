const { Queue } = require('../Queue');

describe('Queue', () => {
  let queue;
  beforeEach(() => {
    queue = new Queue();
  });

  test('enqueue', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    expect(queue.getSize()).toBe(3);
    expect(queue.peekFront().data).toBe('first');
    expect(queue.peekEnd().data).toBe('third');
  });

  test('dequeue', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    queue.dequeue();
    expect(queue.getSize()).toBe(2);
    expect(queue.peekFront().data).toBe('second');
    expect(queue.peekEnd().data).toBe('third');
  });

  test('toArray', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    expect(queue.toArray()).toEqual(expect.arrayContaining(['first','second','third']));
  });

  test('peekFront', () => {
    queue.enqueue('first');
    expect(queue.peekFront().data).toBe('first');
    expect(queue.getSize()).toBe(1);
  });

  test('peekEnd', () => {
    queue.enqueue('first');
    expect(queue.peekEnd().data).toBe('first');
    expect(queue.getSize()).toBe(1);
  });

  test('findAt', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    expect(queue.findAt(1).data).toBe('second');
    expect(queue.findAt(3).data).toBe('first');
  });

  test('removeNode', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    expect(queue.removeNode('second')).toBe(true);
    expect(queue.getSize()).toBe(2);
  });

  test('isEmpty', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue('first');
    expect(queue.isEmpty()).toBe(false);
  });
});
