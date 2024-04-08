import Quadtree from "quadtree-lib";
import { SceneObjectType } from "./SceneObject";
export type TypeQuadtreeItem = {
  x: Quadtree.QuadtreeItem["x"];
  y: Quadtree.QuadtreeItem["y"];
  r?: number;
  id: string;
  type: SceneObjectType;
  collidable: boolean;
};
