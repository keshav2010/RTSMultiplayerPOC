import Quadtree from "quadtree-lib";
import SAT from "sat";
import { TypeQuadtreeItem } from "./types/TypeQuadtreeItem";
import { ISceneItem } from "./types/ISceneItem";
import { SceneObjectType } from "./types/SceneObject";
export class Scene extends Quadtree<TypeQuadtreeItem> {
  sceneItemMap: Map<string, ISceneItem>;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  constructor(opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maxElements?: number;
    tileSize?: number;
  }) {
    super(opts);
    this.tileSize = opts.tileSize || 32;
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
    squareWidth: number,
    type?: SceneObjectType[]
  ) {
    const query: TypeQuadtreeItem = {
      x: x - squareWidth / 2,
      y: y - squareWidth / 2,
      w: squareWidth,
      h: squareWidth,
      width: squareWidth,
      height: squareWidth,
      r: squareWidth / 2,
      id: "query-object",
      type: "FIXED",
      collidable: false,
    };
    let result = this.colliding(query);
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
    let bodiesNearby = this.getNearbyUnits(
      mainCollidingObject.pos.x,
      mainCollidingObject.pos.y,
      mainCollidingObject.width,
      bodyTypeToCheck
    );

    //Obtain "SAT.Response" for each collision.
    const satBoxPolygons = <ISceneItem[]>(
      bodiesNearby
        .map((d) => this.sceneItemMap.get(d.id))
        .filter((body) => Boolean(body?.getSceneItem().collidable))
    );

    satBoxPolygons.forEach((collidingBody) => {
      if (!collidingBody) return;
      const isSelf = collidingBody.getSceneItem().id === mainCollidingObject.id;
      if (isSelf) {
        return;
      }
      const res = new SAT.Response();
      const collidingSceneBody = collidingBody.getSceneItem();
      const circleCollider1 = new SAT.Circle(
        mainCollidingObject.getCircleCenter(),
        mainCollidingObject.r
      );
      const circleCollider2 = new SAT.Circle(
        collidingSceneBody.getCircleCenter(),
        collidingSceneBody.r
      );
      const isColliding = SAT.testCircleCircle(
        circleCollider1,
        circleCollider2,
        res
      );
      if (!isColliding) return;
      res.a = sceneItem;
      res.b = collidingBody;

      // get corresponding items.
      const itemsInMap = satBoxPolygons.filter(
        (d) => Boolean(d) && d && this.sceneItemMap.has(d.id)
      );
      const otherCollidingBodies = itemsInMap.map(
        (item) => this.sceneItemMap.get(item.id)!
      )!;
      callback(res, otherCollidingBodies);
    });
  }
}
