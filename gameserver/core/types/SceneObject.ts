import SAT from "sat";
/**
 * @class SceneObject
 * @classdesc Any object that is meant to be part of the Scene should extend this class.
 */
export type SceneObjectType = "FIXED" | "MOVABLE";

export class SceneObject extends SAT.Box {
  readonly id: string;

  //top left corner of square
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;

  readonly r: number;
  readonly type: SceneObjectType;
  readonly collidable: boolean;

  constructor(
    id: string,
    x: number,
    y: number,
    size = 32,
    type: SceneObjectType,
    collidable: boolean = true
  ) {
    super(new SAT.Vector(x, y), size, size);
    this.width = size;
    this.height = size;
    this.id = id;

    // top-left corner of square hitbox
    this.x = x;
    this.y = y;

    this.r = size / 2;
    this.type = type;
    this.collidable = collidable;
  }
  getPosition() {
    return new SAT.Vector(this.x, this.y);
  }
  setPosition(v: SAT.Vector) {
    this.x = v.x;
    this.y = v.y;
    this.pos.copy(v);
  }
  getCircleCenter(): SAT.Vector {
    // circle hitbox inscribed in square
    const circleCenterOffsetFromTopLeft = this.r;
    return new SAT.Vector(
      this.x + circleCenterOffsetFromTopLeft,
      this.y + circleCenterOffsetFromTopLeft
    );
  }
}
