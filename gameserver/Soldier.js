
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
    isMoveRequired(){
        return (this.expectedPosition.x !== this.currentPosition.x) || (this.expectedPosition.y !== this.currentPosition.y);
    }
    move()
    {
        if(x === this.currentPosition.x && y === this.currentPosition.y)
            return;
        this.expectedPosition = {x,y};
    }
    setTargetPosition(x,y){
        this.expectedPosition = {x,y};
    }
    updateSoldier(){

    }
}
module.exports = Soldier