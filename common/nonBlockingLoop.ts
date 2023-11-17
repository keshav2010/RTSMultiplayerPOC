/**
 *
 * @param {Function} testConditionCallback
 * @param {Function} body
 * @param {Function} onEnd
 */
export function nbLoop(
  testConditionCallback: (...arg: any) => boolean,
  body: () => boolean,
  onEnd: () => any
) {
  if (testConditionCallback()) {
    if (body()) {
      setImmediate(nbLoop, testConditionCallback, body, onEnd);
    } else if (onEnd) onEnd();
  } else if (onEnd) onEnd();
}
