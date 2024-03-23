import { SceneObject } from "./SceneObject";

export interface ISceneItem {
  getSceneItem: () => SceneObject;
}
