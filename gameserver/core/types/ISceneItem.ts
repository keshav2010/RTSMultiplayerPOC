import { IDfied } from "./IDfied";
import { SceneObject } from "./SceneObject";

export interface ISceneItem extends IDfied {
  sceneItemRef: SceneObject;
  getSceneItem: () => SceneObject;
}
