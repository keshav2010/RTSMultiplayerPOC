import Quadtree from "quadtree-lib";
import SAT from "sat";
import { Schema } from '@colyseus/schema'
import { nanoid } from "nanoid";

/**
 * @class SceneObject
 * @classdesc Any object that is meant to be part of the Scene should extend this class.
 */
export type TypeQuadtreeItem = {
  x: Quadtree.QuadtreeItem["x"];
  y: Quadtree.QuadtreeItem["y"];
  width?: Quadtree.QuadtreeItem["width"];
  height?: Quadtree.QuadtreeItem["height"];
  id: string;
};
export class SceneObject<ParentType = any> extends SAT.Box implements Schema {
  id: string;
  parent: ParentType;
  constructor(
    x: number,
    y: number,
    width = 35,
    height = 35,
    parent: ParentType
  ) {
    // {pos:{x,y}}
    super(new SAT.Vector(x, y), width, height);
    this.id = nanoid();
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
