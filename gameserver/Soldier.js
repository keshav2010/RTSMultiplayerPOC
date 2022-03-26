
class Soldier
{
    constructor(type, params)
    {
        this.currentPosition = {x:params.x, y:params.y};
        this.expectedPosition = {x:params.x, y:params.y};
        this.type=type;
        this.health = fighterParams.health || 50;
        this.speed = fighterParams.speed || 5;
        this.cost = fighterParams.cost || 5;
        this.damage = fighterParams.damage || 5;
        this.id = params.id || `soldier${uuidv4()}`;
    }
    moveTo(x,y)
    {
        if(x === this.currentPosition.x && y === this.currentPosition.y)
            return;
        this.expectedPosition = {x,y};
    }
    updateSoldier(){

    }
}
module.exports = Soldier