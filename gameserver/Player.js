
/**
 * Stores soldiers in a map ds
 */
const Soldier = require('./Soldier');
const nbLoop = require('../common/nonBlockingLoop');
const PacketType = require('../common/PacketType');
const SoldierType = require('../common/SoldierType');
const { Queue } = require('../common/Queue');
const { v4: uuidv4 } = require('uuid');

const SoldierCost = {
  [SoldierType.SPEARMAN]: 10,
  [SoldierType.KNIGHT]: 20
}
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

  getSoldierCost(soldierType) {
    return SoldierCost[soldierType];
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
      count:
        (this.SoldierSpawnRequestDetail[requestId]?.count || 0) + spawnCount,
      countdown: (this.SoldierSpawnRequestDetail[requestId]?.countdown || 10),
    };
    return this.SoldierSpawnRequestDetail[requestId];
  }

  processPendingSpawnRequests(deltaTime) {
    if (this.SoldierSpawnRequestIdQueue.getSize() < 1)
      return null;

    let requestId = this.SoldierSpawnRequestIdQueue.peekFront();
    let { soldierType } = this.SoldierSpawnRequestDetail[requestId];

    //resources are not sufficient for upcoming spawn
    if(this.resources < this.getSoldierCost(soldierType))
      return null;
    this.SoldierSpawnRequestDetail[requestId].countdown = Math.max(
      this.SoldierSpawnRequestDetail[requestId].countdown - deltaTime,
      0
    );

    if (this.SoldierSpawnRequestDetail[requestId].countdown > 0)
      return null;
    //reset countdown.
    this.SoldierSpawnRequestDetail[requestId].countdown = 10;
    this.SoldierSpawnRequestDetail[requestId].count -= 1;
    if (this.SoldierSpawnRequestDetail[requestId].count === 0) {
      this.SoldierSpawnRequestIdQueue.dequeue();
      delete this.SoldierSpawnRequestDetail[requestId];
    }
    console.log(this.SoldierSpawnRequestDetail[requestId]);
    return soldierType;
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
        spawnQueue: this.SoldierSpawnRequestIdQueue.toArray().map(id => this.SoldierSpawnRequestDetail[id])
      });

      let soldierTypeToSpawn = this.processPendingSpawnRequests(delta);
      if (soldierTypeToSpawn) {
        let createStatus = stateManager.createSoldier(
          soldierTypeToSpawn,
          this.posX,
          this.posY,
          this.id
        );
        let updatePacket = {
          type: PacketType.ByServer.SOLDIER_CREATE_ACK,
          isCreated: createStatus.status,
        };
        if (createStatus.status) {
          updatePacket = {
            ...updatePacket,
            soldier: createStatus.soldier.getSnapshot(),
            playerId: this.id, //person who created soldier
            soldierType: soldierTypeToSpawn,
          };
        }
        stateManager.cumulativeUpdates.push(updatePacket);
      }

      let soldiersIdArr = [...this.SoldierMap.keys()];
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
    var soldierSnapshots = [];
    if (this.SoldierMap.size > 0)
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
      spawnRequests: this.SoldierSpawnRequestIdQueue.toArray().map(
        (requestId) => this.SoldierSpawnRequestDetail[requestId]
      ),
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