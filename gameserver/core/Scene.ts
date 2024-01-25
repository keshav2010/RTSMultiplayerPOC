import Quadtree, { QuadtreeItem } from "quadtree-lib";
import SAT from "sat";
import { SceneObject, TypeQuadtreeItem } from "./SceneObject";
export class Scene<
  ItemType extends SceneObject
> extends Quadtree<TypeQuadtreeItem> {
  itemIdToItemTypeMap: Map<string, ItemType>;
  constructor(opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maxElements?: number;
  }) {
    super(opts);
    this.itemIdToItemTypeMap = new Map<string, ItemType>();
  }
  removeSceneItem(itemId: string) {
    const item = this.itemIdToItemTypeMap.get(itemId);
    if (!item) return;
    this.itemIdToItemTypeMap.delete(itemId);
    this.remove(item.getQuadtreeItem());
  }
  addSceneItem(item: ItemType, doObserve: boolean = true) {
    this.itemIdToItemTypeMap.set(item.id, item);
    this.push(item.getQuadtreeItem(), doObserve);
  }

  getSceneItemById(id: string) {
    return this.itemIdToItemTypeMap.get(id) || null;
  }

  /**
   * Gets units which are within the bounding box(square)
   * @param {*} soldier
   * @param {*} searchRadius
   * @returns
   */
  getNearbyUnits({ x, y }: { x: number; y: number }, searchRadius: number) {
    const result = this.colliding({ x, y }, (a, b) => {
      // a=> 1st arg, b => actual quadtree object
      const itemA = this.itemIdToItemTypeMap.get(a.id);
      const itemB = this.itemIdToItemTypeMap.get(b.id);
      if (!itemA || !itemB) return false;

      let aPos = new SAT.Vector(itemA.pos.x, itemA.pos.y);
      let bPos = new SAT.Vector(
        itemB.pos.x + itemB.w / 2,
        itemB.pos.y + itemB.h / 2
      );
      let distance = new SAT.Vector().copy(aPos).sub(bPos).len();
      return distance <= 2 * searchRadius;
    });
    return result;
  }

  //Check if unit/sceneItem is colliding with other units/soldiers
  checkOne(
    sceneItem: ItemType,
    callback: (arg0: SAT.Response, arg1: ItemType[]) => void
  ) {
    //fetch all bodies with which soldier is colliding in Quadtree
    let collidingBodies = this.colliding({
      x: sceneItem.pos.x,
      y: sceneItem.pos.y,
      width: sceneItem.w,
      height: sceneItem.h,
    });

    //Colliding Bodies will always have 1 element, which is the soldier itself.
    if (collidingBodies.length < 2) return;

    //Obtain "SAT.Response" for each collision.
    var satBoxPolygons = collidingBodies.map((d) =>
      this.itemIdToItemTypeMap.get(d.id)
    );
    satBoxPolygons.forEach((collidingSoldier) => {
      if (!collidingSoldier) return;

      //skip collision with self
      if (collidingSoldier.id === sceneItem.id) {
        return;
      }
      var res = new SAT.Response();
      SAT.testPolygonPolygon(
        sceneItem.toPolygon(),
        collidingSoldier.toPolygon(),
        res
      );

      res.a = sceneItem;
      res.b = collidingSoldier;

      // get corresponding items.
      const itemsInMap = collidingBodies.filter((d) =>
        this.itemIdToItemTypeMap.has(d.id)
      );
      const callbackItemArg = itemsInMap.map(
        (item) => this.itemIdToItemTypeMap.get(item.id)!
      );
      callback(res, callbackItemArg);
    });
  }
  update() {
    //this.system.update();
  }
}
