import Quadtree from "quadtree-lib";
import { SceneObjectType } from "./SceneObject";
export type TypeQuadtreeItem = {
  x: Quadtree.QuadtreeItem["x"];
  y: Quadtree.QuadtreeItem["y"];
  width?: Quadtree.QuadtreeItem["width"];
  height?: Quadtree.QuadtreeItem["height"];
  id: string;
  type: SceneObjectType;
  collidable: boolean;
};
