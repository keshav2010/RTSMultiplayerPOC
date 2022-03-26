const {v4} = require('uuid');
const uuidv = v4;
co
 class Player
 {
    constructor(id, name){
        this.name = name || 'Keshav';
        this.id = id || `player_${uuidv()}`;
        this.SoldierMap = new Map();
        this.resources = 100;
    }
    createSoldier(type, x, y){
        let s = new Soldier(type, x, y);
        this.SoldierMap.set(s.id, s);
    }
    removeSoldier(id){
        let isDeleted = this.SoldierMap.delete(id);
    }
 }
 module.exports = Player;