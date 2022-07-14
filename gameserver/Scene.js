/**
 */
const Soldier = require("./Soldier");
const PacketType = require("../common/PacketType");
const SoldierType = require("../common/SoldierType");
const ServerLocalEvents = require("./ServerLocalEvents");
const Collision = require("detect-collisions");
const Quadtree = require("quadtree-lib");
const SAT = require("sat");

class Scene extends Quadtree {
  constructor(stateManager, width, height) {
    width = width || 15;
    height = height || 15;
    super({ width, height });
    this.stateManager = stateManager;
  }
  removeSoldier(soldierObject) {
    this.remove(soldierObject);
  }
  insertSoldier(soldierObject) {
    this.push(soldierObject, true);
  }

  /**
   * Gets units which are within the bounding box(square)
   * @param {*} soldier
   * @param {*} searchRadius
   * @returns
   */
  getNearbyUnits(soldier, searchRadius) {
    let result = this.colliding({
      x: soldier.pos.x,
      y: soldier.pos.y
    }, function(a, b){
      let aPos = new SAT.Vector(a.x, a.y)
      let bPos = new SAT.Vector(b.x, b.y)
      let distance = new SAT.Vector().copy(aPos).sub(bPos).len();
      return (distance <= 2*searchRadius);
    });
    return result;
  }

  //Check if soldier is colliding with other units/soldiers
  checkOne(soldier, callback) {
    //fetch all bodies with which soldier is colliding in Quadtree
    let collidingBodies = this.colliding({
      x: soldier.pos.x - soldier.w/2,
      y: soldier.pos.y - soldier.h/2,
      w: soldier.w,
      h: soldier.h
    }, function(a,b) {
      let aPos = new SAT.Vector(a.x, a.y)
      let bPos = new SAT.Vector(b.x, b.y)
      let distance = new SAT.Vector().copy(aPos).sub(bPos).len();
      return distance <= 2*Math.max(a.w, a.h)
    });

    //Colliding Bodies will always have 1 element, which is the soldier itself.
    if (collidingBodies.length < 2) 
      return;

    //Obtain "SAT.Response" for each collision.
    var satBoxPolygons = collidingBodies;
    satBoxPolygons.forEach((collidingSoldier) => {
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
    });
  }
  update() {
    //this.system.update();
  }
}
module.exports = Scene;
