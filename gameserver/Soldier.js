
class Soldier
{
    static sid=0;

    constructor(type, params)
    {
        this.currentPosition = {x:params.x, y:params.y};
        this.expectedPosition = {x:params.x, y:params.y};
        this.type=type;
        this.health = fighterParams.health || 50;
        this.speed = fighterParams.speed || 5;
        this.cost = fighterParams.cost || 5;
        this.damage = fighterParams.damage || 5;
        this.id = Soldier.sid;
        Soldier.sid++;
    }

    tick(delta, updateManager){
        let diffX = this.expectedPosition.x - this.currentPosition.x;
        let diffY = this.expectedPosition.y - this.currentPosition.y;
        this.currentPosition.x += this.speed*delta*diffX;
        this.currentPosition.y += this.speed*delta*diffY;

        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
            currentPositionX: this.currentPosition.x,
            currentPositionY: this.currentPosition.y
        });
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
            cost: this.cost,
            damage: this.damage,
            id: this.id
        }
    }
    setTargetPosition(x,y){
        this.expectedPosition = {x,y};
    }
}
module.exports = Soldier