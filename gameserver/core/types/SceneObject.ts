import SAT from "sat";
/**
 * @class SceneObject
 * @classdesc Any object that is meant to be part of the Scene should extend this class.
 */
export type SceneObjectType = "FIXED" | "MOVABLE";
export class SceneObject extends SAT.Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: SceneObjectType;
  collidable: boolean;
  constructor(
    id: string,
    x: number,
    y: number,
    width = 35,
    height = 35,
    type: SceneObjectType,
    collidable: boolean = true
  ) {
    // {pos:{x,y}}
    super(new SAT.Vector(x, y), width, height);
    this.id = id;
    this.x = this.pos.x;
    this.y = this.pos.y;
    this.width = this.w;
    this.height = this.h;
    this.type = type;
    this.collidable = collidable;
  }
}
