import Quadtree from "quadtree-lib";
import SAT from "sat";
import { TypeQuadtreeItem } from "./types/TypeQuadtreeItem"
import { ISceneItem } from "./types/ISceneItem"
import { SceneObjectType } from "./types/SceneObject";
export class Scene extends Quadtree<TypeQuadtreeItem> {
  sceneItemMap: Map<string, ISceneItem>;
  width: number;
  height: number;
  tileSize: number;

  constructor(opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maxElements?: number;
  }) {
    super(opts);
    this.tileSize = 32;
    this.width = opts.width;
    this.height = opts.height;
    this.sceneItemMap = new Map<string, ISceneItem>();
  }

  getDimension() {
    return new SAT.Vector(this.width, this.height);
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
   * Gets units which are within the region
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
      // Create circles for each object
      const aCircle = new SAT.Circle(
        new SAT.Vector(a.x, a.y),
        Math.max(searchRadius, a.r || 0)
      );
      const bCircle = new SAT.Circle(new SAT.Vector(b.x, b.y), b.r);

      // Perform circle-circle collision detection
      const response = new SAT.Response();
      const collided = SAT.testCircleCircle(aCircle, bCircle, response);
      return collided;
    });

    if (type) result = result.filter((body) => type?.includes(body.type));
    return result;
  }

  //Check if unit/sceneItem is colliding with other units/soldiers
  checkCollisionOnObject(
    sceneItem: ISceneItem,
    bodyTypeToCheck: SceneObjectType[] | undefined,
    callback: (arg0: SAT.Response, arg1: ISceneItem[]) => void
  ) {
    const mainCollidingObject = sceneItem.getSceneItem();
    //fetch all bodies which are colliding with the soldier specified by x,y,r in arg.
    let collidingBodies = this.getNearbyUnits(
      mainCollidingObject.pos.x,
      mainCollidingObject.pos.y,
      mainCollidingObject.r,
      bodyTypeToCheck
    );
    //Colliding Bodies will always have 1 element, which is the soldier itself.

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
      const isColliding = SAT.testCircleCircle(
        mainCollidingObject,
        collidingBody.getSceneItem(),
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
