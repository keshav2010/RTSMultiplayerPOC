import Quadtree from "quadtree-lib";
import SAT from "sat";

import { SceneObject, TypeQuadtreeItem } from "./SceneObject";
export interface ISceneItem {
  getSceneItem: () => SceneObject;
}

export class Scene<
  SceneItemType extends ISceneItem
> extends Quadtree<TypeQuadtreeItem> {
  sceneItemMap: Map<string, SceneItemType>;

  constructor(opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maxElements?: number;
  }) {
    super(opts);
    this.sceneItemMap = new Map<string, SceneItemType>();
  }

  removeSceneItem(itemId: string) {
    if (!this.sceneItemMap.has(itemId)) return;
    const item = this.sceneItemMap.get(itemId)!;
    const sceneObject = item.getSceneItem();

    this.remove(sceneObject.getQuadtreeItem());
    this.sceneItemMap.delete(itemId);
  }

  addSceneItem(item: SceneItemType, doObserve: boolean = true) {
    this.sceneItemMap.set(item.getSceneItem().id, item);
    this.push(item.getSceneItem().getQuadtreeItem(), doObserve);
  }

  getSceneItemById(id: string) {
    return (this.sceneItemMap.get(id)) || null;
  }

  /**
   * Gets units which are within the bounding box(square)
   * @param {*} soldier
   * @param {*} searchRadius
   * @returns
   */
  getNearbyUnits(x: number, y: number, searchRadius: number) {
    const result = this.colliding({ x, y }, (a, b) => {
      // a=> 1st arg, b => actual quadtree object
      const itemA = this.sceneItemMap.get(a.id);
      const itemB = this.sceneItemMap.get(b.id);
      if (!itemA || !itemB) return false;

      let aPos = new SAT.Vector(
        itemA.getSceneItem().pos.x,
        itemA.getSceneItem().pos.y
      );
      let bPos = new SAT.Vector(
        itemB.getSceneItem().pos.x + itemB.getSceneItem().w / 2,
        itemB.getSceneItem().pos.y + itemB.getSceneItem().h / 2
      );
      let distance = new SAT.Vector().copy(aPos).sub(bPos).len();
      return distance <= 2 * searchRadius;
    });
    return result;
  }

  //Check if unit/sceneItem is colliding with other units/soldiers
  checkOne(
    sceneItem: ISceneItem,
    callback: (arg0: SAT.Response, arg1: ISceneItem[]) => void
  ) {
    //fetch all bodies with which soldier is colliding in Quadtree
    let collidingBodies = this.colliding({
      x: sceneItem.getSceneItem().pos.x,
      y: sceneItem.getSceneItem().pos.y,
      width: sceneItem.getSceneItem().w,
      height: sceneItem.getSceneItem().h,
    });

    //Colliding Bodies will always have 1 element, which is the soldier itself.
    if (collidingBodies.length < 2) return;

    //Obtain "SAT.Response" for each collision.
    var satBoxPolygons = collidingBodies.map((d) =>
      this.sceneItemMap.get(d.id)
    );
    satBoxPolygons.forEach((collidingSoldier) => {
      if (!collidingSoldier) return;

      //skip collision with self
      if (collidingSoldier.getSceneItem().id === sceneItem.getSceneItem().id) {
        return;
      }
      var res = new SAT.Response();
      SAT.testPolygonPolygon(
        sceneItem.getSceneItem().toPolygon(),
        collidingSoldier.getSceneItem().toPolygon(),
        res
      );

      res.a = sceneItem;
      res.b = collidingSoldier;

      // get corresponding items.
      const itemsInMap = collidingBodies.filter((d) =>
        this.sceneItemMap.has(d.id)
      );
      const callbackItemArg = itemsInMap.map(
        (item) => this.sceneItemMap.get(item.id)!
      );
      callback(res, callbackItemArg);
    });
  }
}
