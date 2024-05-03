import Quadtree from "quadtree-lib";
import { SceneObjectType } from "./SceneObject";
export type TypeQuadtreeItem = {
  id: string;
  x: Quadtree.QuadtreeItem["x"];
  y: Quadtree.QuadtreeItem["y"];
  w: number;
  h: number;
  width: number;
  height: number;
  r: number;
  type: SceneObjectType;
  collidable: boolean;
};
