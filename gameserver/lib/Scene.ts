import Quadtree, { QuadtreeItem } from "quadtree-lib";
import SAT from "sat";
import { GameStateManager } from "./GameStateManager";
export class Scene extends Quadtree<any> {
  stateManager: GameStateManager;
  constructor(stateManager: GameStateManager, width?: number, height?: number) {
    width = width || 15;
    height = height || 15;
    super({ width, height });
    this.stateManager = stateManager;
  }
  removeSoldier(soldierObject: any) {
    this.remove(soldierObject);
  }
  insertSoldier(soldierObject: any) {
    this.push(soldierObject, true);
  }

  /**
   * Gets units which are within the bounding box(square)
   * @param {*} soldier
   * @param {*} searchRadius
   * @returns
   */
  getNearbyUnits({ x, y }: any, searchRadius: number) {
    let result = this.colliding(
      { x, y },
      function (
        a: { x: any; y: any },
        b: { x: number; w: number; y: number; h: number }
      ) {
        // a=> 1st arg, b => actual quadtree object
        let aPos = new SAT.Vector(a.x, a.y);
        let bPos = new SAT.Vector(b.x + b.w / 2, b.y + b.h / 2);
        let distance = new SAT.Vector().copy(aPos).sub(bPos).len();
        return distance <= 2 * searchRadius;
      }
    );
    return result;
  }

  //Check if soldier is colliding with other units/soldiers
  checkOne(
    soldier: {
      pos: { x: any; y: any };
      w: any;
      h: any;
      id: any;
      toPolygon: () => any;
    },
    callback: (arg0: any, arg1: any) => void
  ) {
    //fetch all bodies with which soldier is colliding in Quadtree
    let collidingBodies = this.colliding({
      x: soldier.pos.x,
      y: soldier.pos.y,
      width: soldier.w,
      height: soldier.h,
    });

    //Colliding Bodies will always have 1 element, which is the soldier itself.
    if (collidingBodies.length < 2) return;

    //Obtain "SAT.Response" for each collision.
    var satBoxPolygons = collidingBodies;
    satBoxPolygons.forEach(
      (collidingSoldier: { id: any; toPolygon: () => any }) => {
        //skip collision with self
        if (collidingSoldier.id === soldier.id) {
          return;
        }
        var res = new SAT.Response();
        SAT.testPolygonPolygon(
          soldier.toPolygon(),
          collidingSoldier.toPolygon(),
          res
        );

        res.a = soldier;
        res.b = collidingSoldier;

        callback(res, collidingBodies);
      }
    );
  }
  update() {
    //this.system.update();
  }
}
