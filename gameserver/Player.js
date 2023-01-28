
/**
 * Stores soldiers in a map ds
 */
const Soldier = require('./Soldier');
const nbLoop = require('../common/nonBlockingLoop');
const PacketType = require('../common/PacketType');
const SoldierType = require('../common/SoldierType');
const { Queue } = require('./lib/Queue');
const { v4: uuidv4 } = require('uuid');
class Player {
  static maxResources = 200;
  static resourceMultiplier = 1; //per second
  constructor(id, name) {
    this.name = name || "Keshav";
    this.id = id;
    this.SoldierMap = new Map();
    this.resources = 30;
    this.color = [
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
    ];

    this.SoldierSpawnRequestIdQueue = new Queue();
    this.SoldierSpawnRequestDetail = {};

    //flag poss
    this.posX = 200 + Math.random() * 400;
    this.posY = 200 + Math.random() * 400;
  }

  queueSoldierSpawnRequest(soldierType, spawnCount = 1) {
    const lastQueuedRequest = this.SoldierSpawnRequestIdQueue.peekEnd();
    const lastQueuedSoldierType =
      lastQueuedRequest &&
      this.SoldierSpawnRequestDetail[lastQueuedRequest].soldierType;

    let requestId;
    if (lastQueuedSoldierType === soldierType) {
      requestId = lastQueuedRequest;
    } else {
      requestId = uuidv4();
      this.SoldierSpawnRequestIdQueue.enqueue(requestId);
    }

    this.SoldierSpawnRequestDetail[requestId] = {
      id: requestId,
      soldierType,
      count: this.SoldierSpawnRequestDetail[requestId].count + spawnCount,
      countdown: 10
    };
    return this.SoldierSpawnRequestDetail[requestId];
  }

  setSpawnPoint(x, y) {
    this.posX = x;
    this.posY = y;
  }

  tick(delta, updateManager, stateManager) {
    try {
      this.resources += Player.resourceMultiplier * delta;
      this.resources = Math.min(this.resources, Player.maxResources);

      //Queue delta update
      updateManager.queueServerEvent({
        type: PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
        playerId: this.id,
        resources: this.resources,
      });

      let soldiersIdArr = [...this.SoldierMap.keys()];
      /*
            var i=0;
            var test = ()=>{return (i<soldiersIdArr.length)}
            var loop = ()=>{
                let soldierObject = this.SoldierMap.get(soldiersIdArr[i++]);
                if(!soldierObject)
                    return true;
                soldierObject.tick(delta, updateManager, stateManager);
                return true; //continue
            }
            nbLoop(test, loop);
            */
      for (let i = 0; i < soldiersIdArr.length; i++) {
        let soldierObject = this.SoldierMap.get(soldiersIdArr[i]);
        if (!soldierObject) continue;
        soldierObject.tick(delta, updateManager, stateManager);
      }
    } catch (err) {
      console.error(err);
    }
  }
  getSnapshot() {
    //get snapshot for each soldier
    var soldierSnapshots=[];
    if(this.SoldierMap.size > 0)
      soldierSnapshots = [
        ...this.SoldierMap.values().map((soldier) => soldier.getSnapshot()),
      ];
    return {
      name: this.name,
      id: this.id,
      resources: this.resources,
      posX: this.posX,
      posY: this.posY,
      soldiers: soldierSnapshots,
      color: [...this.color],
      spawnRequests: this.SoldierSpawnRequestIdQueue.toArray().map(requestId => this.SoldierSpawnRequestDetail[requestId])
    };
  }
  createSoldier(type, x, y) {
    x = this.posX;
    y = this.posY;
    type = type || SoldierType.SPEARMAN;
    if (this.resources < 10) return { status: false };
    let s = new Soldier(
      type,
      {
        x,
        y,
        health: 100,
        speed: 5,
        cost: 5,
        damage: 5,
        playerId: this.id,
      },
      this
    );
    this.resources -= 10;
    this.SoldierMap.set(s.id, s);
    return { status: true, soldierId: s.id, soldier: s };
  }
  getSoldier(soldierId) {
    return this.SoldierMap.get(soldierId);
  }

  removeSoldier(id, stateManager) {
    try {
      let soldierToRemove = this.SoldierMap.get(id);
      if (soldierToRemove) stateManager.scene.remove(soldierToRemove);
      this.SoldierMap.delete(id);
    } catch (err) {
      console.log(err);
    }
  }

  destroy(stateManager) {
    this.SoldierMap.forEach((soldier) => {
      stateManager.scene.remove(soldier);
    });
    this.SoldierMap = new Map();
  }
}
module.exports = Player;