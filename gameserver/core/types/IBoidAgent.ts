export interface IBoidAgent<GroupLeadType extends IBoidAgent = any> {
  currentPositionX: number;
  currentPositionY: number;
  setPosition: (arg: SAT.Vector) => void;

  // position ideally intended by client
  targetPositionX: number;
  targetPositionY: number;
  setTargetPosition: (arg: SAT.Vector) => void;

  // fallback position, over target-pos
  expectedPositionX: number;
  expectedPositionY: number;
  getExpectedPosition: (...args: any) => SAT.Vector;
  setExpectedPosition: (arg: SAT.Vector) => void;

  getSeperationVector: (...args: any) => SAT.Vector;

  velocityVector: SAT.Vector;
  getVelocityVector: (...args: any) => SAT.Vector;

  groupLeader?: GroupLeadType;
  offsetFromPosition: SAT.Vector;
  setGroupLeader: (arg: GroupLeadType) => void;
  getGroupLeader: () => GroupLeadType | undefined;

  getDistanceFromExpectedPosition: () => number;
  applyForce: (force: SAT.Vector) => void;
}
