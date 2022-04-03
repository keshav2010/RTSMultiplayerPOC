
const PacketType = require('../common/PacketType')
class Soldier
{
    static sid=0;

    constructor(type, params)
    {
        this.currentPosition = {x:params.x, y:params.y};
        this.expectedPosition = {x:params.x, y:params.y};
        this.type=type;
        this.health = params.health || 50;
        this.speed = params.speed || 5;
        this.cost = params.cost || 5;
        this.damage = params.damage || 5;
        this.id = ''+Soldier.sid;
        this.playerId = ''+params.playerId
        Soldier.sid++;
    }

    tick(delta, updateManager){
        let diffX = this.expectedPosition.x - this.currentPosition.x;
        let diffY = this.expectedPosition.y - this.currentPosition.y;
        if(Math.abs(diffX)+Math.abs(diffY) === 0)
            return;
        else if(Math.abs(diffX)+Math.abs(diffY) < 1){
            this.currentPosition = {x:this.expectedPosition.x, y:this.expectedPosition.y}
            diffX=diffY=0;
        }
        else {
            this.currentPosition.x += this.speed*delta*diffX;
            this.currentPosition.y += this.speed*delta*diffY;
        }
        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
            soldier: this.getSnapshot()
        });
    }

    setTargetPosition(x,y){
        this.expectedPosition = {x,y}
    }
    //Returns a perfectly serializable object with no refs, this object can be shared between threads
    getSnapshot(){
        return {
            currentPositionX: this.currentPosition.x,
            currentPositionY: this.currentPosition.y,

            expectedPositionX: this.expectedPosition.x,
            expectedPositionY: this.expectedPosition.y,

            type: this.type,

            health: this.health,
            speed: this.speed,
            damage: this.damage,
            cost: this.cost,

            id: this.id,
            playerId: this.playerId
        }
    }
}
module.exports = Soldier