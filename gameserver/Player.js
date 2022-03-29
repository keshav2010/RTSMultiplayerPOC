
/**
 * Stores soldiers in a map ds
 */
const {Soldier} = require('./Soldier');
const {v4} = require('uuid');
const uuidv = v4;
class Player
{
    constructor(id, name){
        this.name = name || 'Keshav';
        this.id = id || `player_${uuidv()}`;
        this.SoldierMap = new Map();
        this.resources = 100;

        //flag pos
        this.posX = 200+Math.random()*400;
        this.posY = 200+Math.random()*400;
    }
    createSoldier(type, x, y){
        x = x||this.posX;
        y = y||this.posY;
        type=type||'spearman';
        if(this.resources < 10)
            return {status:false};
        let s = new Soldier(type, x, y);
        this.resources -= 10;
        this.SoldierMap.set(s.id, s);
        return {status:true, soldierId: s.id};
    }
    getSoldier(soldierId){
        return this.SoldierMap.get(soldierId);
    }
    removeSoldier(id){
        let isDeleted = this.SoldierMap.delete(id);
    }
}
module.exports = Player;