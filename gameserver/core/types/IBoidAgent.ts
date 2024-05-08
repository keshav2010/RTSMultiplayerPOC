export interface IBoidAgent {
  currentPosition: { x: number; y: number };
  setPosition: (arg: SAT.Vector) => void;

  // position ideally intended by client
  targetPosition: { x: number; y: number };
  setTargetPosition: (arg: SAT.Vector) => void;

  // fallback position, over target-pos
  expectedPosition: {x: number; y: number};

  getExpectedPosition: (...args: any) => SAT.Vector;
  setExpectedPosition: (arg: SAT.Vector) => void;

  getSeperationVector: (...args: any) => SAT.Vector;

  velocityVector: SAT.Vector;
  getVelocityVector: (...args: any) => SAT.Vector;

  getDistanceFromExpectedPosition: () => number;
  applyForce: (force: SAT.Vector) => void;
}
