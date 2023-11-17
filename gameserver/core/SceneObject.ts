import Quadtree from "quadtree-lib";
import SAT from "sat";

export class SceneObject<ParentType = any>
  extends SAT.Box
  implements Quadtree.QuadtreeItem
{
  parent: ParentType;
  x: number;
  width: number;
  height: number;
  y: number;
  constructor(
    x: number,
    y: number,
    width = 35,
    height = 35,
    parent: ParentType
  ) {
    // {pos:{x,y}}
    super(new SAT.Vector(x, y), width, height);
    this.parent = parent;

    //used by quadtrees
    this.x = this.pos.x;
    this.y = this.pos.y;
    this.width = this.w;
    this.height = this.h;
  }
}
