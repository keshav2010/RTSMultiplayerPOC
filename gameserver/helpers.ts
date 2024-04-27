import SAT from "sat";
export function clampVector(
  target: SAT.Vector,
  minVector: SAT.Vector,
  maxVector: SAT.Vector
) {
  const t = target.clone();
  t.x = Math.max(minVector.x, t.x);
  t.y = Math.max(minVector.y, t.y);

  t.x = Math.min(maxVector.x, t.x);
  t.y = Math.min(maxVector.y, t.y);
  return t;
}
