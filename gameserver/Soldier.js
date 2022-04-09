
const PacketType = require('../common/PacketType')
const {Circle} = require('detect-collisions');

class Soldier extends Circle {
    static sid=0;
    constructor(type, params, parentObject)
    {
        super({x:params.x, y:params.y}, params.radius || 15);

        this.parent = parentObject;
        this.expectedPosition = {x:params.x, y:params.y};

        //The target position is the actual position client wanted this unit to move to.
        //However a unit may not reach target position due to other member of blocking the position.
        //This value however can be used to check if two units were asked to move to same position
        //and therefore we can assume in that case they were part of same flock.
        this.targetPosition = {x:params.x, y:params.y};

        this.soldierType=type;

        this.health = params.health || 50;
        this.speed = params.speed || 5;
        this.cost = params.cost || 5;
        this.damage = params.damage || 5;

        this.id = ''+Soldier.sid;
        this.playerId = ''+params.playerId

        Soldier.sid++;
    }
    hasReachedDestination(){
        let diffX = this.targetPosition.x - this.pos.x;
        let diffY = this.targetPosition.y - this.pos.y;
        let mag = Math.sqrt(diffX*diffX + diffY*diffY);
        return (mag<3);
    }
    tick(delta, updateManager, stateManager){
        let diffX = this.expectedPosition.x - this.pos.x;
        let diffY = this.expectedPosition.y - this.pos.y;
        let mag = Math.sqrt(diffX*diffX + diffY*diffY);
        if(mag === 0)
            return;
        else if(mag < 1){
            diffX = diffY = 0;
            this.setPosition(this.expectedPosition.x, this.expectedPosition.y);
        } 
        else {
            diffX = diffX/mag;
            diffY = diffY/mag;
        }
        this.setPosition(this.pos.x+this.speed*delta*diffX, this.pos.y+this.speed*delta*diffY);
        stateManager.scene.system.updateBody(this);
        stateManager.scene.system.checkOne(this, (res)=>{
            let a = res.a;
            let b = res.b;
            a.setPosition(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y);
            if(a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y && (a.hasReachedDestination() || b.hasReachedDestination())){
                a.expectedPosition = {x: a.pos.x, y: a.pos.y};
                b.expectedPosition = {x: b.pos.x, y: b.pos.y};
            }
        });
        stateManager.scene.system.updateBody(this);

        //this.parent.stateManager.scene.updateBody(this);
        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
            soldier: this.getSnapshot()
        });
    }

    setTargetPosition(x,y){
        this.targetPosition = {x,y};
        this.expectedPosition = {x,y};
    }
    //Returns a perfectly serializable object with no refs, this object can be shared between threads
    getSnapshot(){
        return {
            currentPositionX: this.pos.x,
            currentPositionY: this.pos.y,

            expectedPositionX: this.expectedPosition.x,
            expectedPositionY: this.expectedPosition.y,

            type: this.soldierType,
            radius: this.r,

            health: this.health,
            speed: this.speed,
            damage: this.damage,
            cost: this.cost,

            id: this.id,
            playerId: this.playerId
        }
    }

    clearObject(){

    }
}
module.exports = Soldier