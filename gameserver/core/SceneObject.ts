import Quadtree from "quadtree-lib";
import SAT from "sat";
import { v4 as uuidv4 } from "uuid";
import { Scene } from "./Scene";

/**
 * @class SceneObject
 * @classdesc Any object that is meant to be part of the Scene should extend this class.
 */
export type TypeQuadtreeItem = Quadtree.QuadtreeItem & { id: string };
export class SceneObject<ParentType = any> extends SAT.Box {
  id: string;
  parent: ParentType;
  constructor(
    x: number,
    y: number,
    width = 35,
    height = 35,
    parent: ParentType,
  ) {
    // {pos:{x,y}}
    super(new SAT.Vector(x, y), width, height);
    this.id = uuidv4();
    this.parent = parent;
  }
  getQuadtreeItem(): TypeQuadtreeItem {
    return {
      id: this.id,
      x: this.pos.x,
      y: this.pos.y,
      width: this.w,
      height: this.h,
    } as TypeQuadtreeItem;
  }
}
