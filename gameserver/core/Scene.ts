import Quadtree from "quadtree-lib";
import SAT from "sat";

import { SceneObject, SceneObjectType, TypeQuadtreeItem } from "./SceneObject";
export interface ISceneItem {
  getSceneItem: () => SceneObject;
}

export class Scene extends Quadtree<TypeQuadtreeItem> {
  sceneItemMap: Map<string, ISceneItem>;

  constructor(opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maxElements?: number;
  }) {
    super(opts);
    this.sceneItemMap = new Map<string, ISceneItem>();
  }

  removeSceneItem(itemId: string) {
    if (!this.sceneItemMap.has(itemId)) {
      console.log(`item ${itemId} not found in scene`);
      return;
    }
    const item = this.sceneItemMap.get(itemId)!;
    const sceneObject = item.getSceneItem();

    this.remove(sceneObject);
    this.sceneItemMap.delete(itemId);
  }

  addSceneItem(item: ISceneItem, doObserve: boolean = true) {
    this.sceneItemMap.set(item.getSceneItem().id, item);
    this.push(item.getSceneItem(), doObserve);
  }

  getSceneItemById<ReturnType extends ISceneItem = ISceneItem>(id: string) {
    return (this.sceneItemMap.get(id) as ReturnType) || null;
  }

  /**
   * Gets units which are within the bounding box(square)
   * @param {*} soldier
   * @param {*} searchRadius
   * @returns
   */
  getNearbyUnits(
    x: number,
    y: number,
    searchRadius: number,
    type?: SceneObjectType[]
  ) {
    let result = this.colliding({ x, y }, (a, b) => {
      // a=> 1st arg, b => actual quadtree object
      const aPos = new SAT.Vector(a.x, a.y);
      const bPos = new SAT.Vector(b.x + b.width! / 2, b.y + b.height! / 2);
      let distance = aPos.clone().sub(bPos).len();
      return distance <= 2 * searchRadius;
    });
    if (type) result = result.filter((body) => type?.includes(body.type));
    return result;
  }

  //Check if unit/sceneItem is colliding with other units/soldiers
  checkOne(
    sceneItem: ISceneItem,
    callback: (arg0: SAT.Response, arg1: ISceneItem[]) => void
  ) {
    const mainCollidingObject = sceneItem.getSceneItem();
    //fetch all bodies which are colliding with the soldier specified by x,y,w,h in arg.
    let collidingBodies = this.colliding({
      x: mainCollidingObject.pos.x,
      y: mainCollidingObject.pos.y,
      width: mainCollidingObject.w,
      height: mainCollidingObject.h,
    });

    //Colliding Bodies will always have 1 element, which is the soldier itself.
    if (collidingBodies.length < 2) return;

    //Obtain "SAT.Response" for each collision.
    const satBoxPolygons = collidingBodies
      .map((d) => this.sceneItemMap.get(d.id))
      .filter((body) => body && body.getSceneItem().collidable);

    satBoxPolygons.forEach((collidingBody) => {
      if (!collidingBody) return;

      const isSelf = collidingBody.getSceneItem().id === mainCollidingObject.id;
      if (isSelf) {
        return;
      }

      const res = new SAT.Response();
      const isColliding = SAT.testPolygonPolygon(
        mainCollidingObject.toPolygon(),
        collidingBody.getSceneItem().toPolygon(),
        res
      );
      if (!isColliding) return;
      res.a = sceneItem;
      res.b = collidingBody;

      // get corresponding items.
      const itemsInMap = collidingBodies.filter((d) =>
        this.sceneItemMap.has(d.id)
      );
      const otherCollidingBodies = itemsInMap.map(
        (item) => this.sceneItemMap.get(item.id)!
      );
      callback(res, otherCollidingBodies);
    });
  }
}
