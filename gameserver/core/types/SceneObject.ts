import SAT from "sat";
/**
 * @class SceneObject
 * @classdesc Any object that is meant to be part of the Scene should extend this class.
 */
export type SceneObjectType = "FIXED" | "MOVABLE";
export class SceneObject extends SAT.Circle {
  id: string;
  x: number;
  y: number;
  r: number;
  type: SceneObjectType;
  collidable: boolean;
  constructor(
    id: string,
    x: number,
    y: number,
    radius = 32,
    type: SceneObjectType,
    collidable: boolean = true
  ) {
    super(new SAT.Vector(x, y), radius);
    this.id = id;
    this.x = this.pos.x;
    this.y = this.pos.y;
    this.r = radius;
    this.type = type;
    this.collidable = collidable;
  }
}
