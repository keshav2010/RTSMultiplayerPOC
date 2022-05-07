
/**
*/
const Soldier = require('./Soldier');
const PacketType = require('../common/PacketType');
const SoldierType = require('../common/SoldierType');
const ServerLocalEvents = require('./ServerLocalEvents');
const Collision = require('detect-collisions');
const Quadtree = require("quadtree-lib")
const SAT = require('sat');

class Scene extends Quadtree
{
    constructor(stateManager, width, height){
        width = width || 1600;
        height = height || 1600;
        super({width, height});
        this.stateManager = stateManager;
    }
    removeSoldier(soldierObject){
        this.remove(soldierObject);
    }
    insertSoldier(soldierObject){
        this.push(soldierObject, true);
    }

    //Check if soldier is colliding with other units/soldiers
    checkOne(soldier, callback){

        //fetch all bodies with which soldier is colliding in Quadtree
        let collidingBodies = this.colliding({
            x: soldier.x,
            y: soldier.y,
            width: soldier.w,
            height: soldier.h
        });

        //Colliding Bodies will always have 1 element, which is the soldier itself.
        if(collidingBodies.length < 2)
            return;
        
        //Obtain "SAT.Response" for each collision.
        var satBoxPolygons = collidingBodies;
        satBoxPolygons.forEach( collidingSoldier => {
            //skip collision with self
            if(collidingSoldier.id === soldier.id){
                return;
            }
            var res = new SAT.Response();
            SAT.testPolygonPolygon(soldier.toPolygon(), collidingSoldier.toPolygon(), res);
            
            res.a = soldier;
            res.b = collidingSoldier;

            callback(res);
        })
    }

    update(){
        //this.system.update();
    }
}
module.exports = Scene