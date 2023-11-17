/**
 * Stores soldiers in a map ds
 */
import { Queue } from "../common/Queue";
import { Soldier, SoldierSnapshot } from "./Soldier";
import { GameStateManager } from "./lib/GameStateManager";
import { Packet } from "./lib/Packet";
import { SoldierType, SoldierTypeConfig } from "../common/SoldierType";
import { PacketType } from "../common/PacketType";
import { v4 as uuidv4 } from "uuid";
import PacketActions from "./PacketActions";

export class Player {
  static maxResources = 200;
  static resourceMultiplier = 1; //per second
  id: string;
  name: string;
  SoldierMap: Map<string, Soldier>;
  resources: number;
  color: number[];
  SoldierSpawnRequestIdQueue: Queue<string>;
  SoldierSpawnRequestDetail: {
    [key: string]: {
      id: string;
      soldierType: SoldierType;
      count: number;
      countdown: number;
    };
  };
  readyStatus: boolean;
  posX: number;
  posY: number;
  spawnFlagHealth: number;
  playerState: string;
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name || `UnnamedPlayer${id.substr(0, 4)}`;
    this.SoldierMap = new Map();
    this.resources = 10;
    this.color = [
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
    ];

    this.SoldierSpawnRequestIdQueue = new Queue();
    this.SoldierSpawnRequestDetail = {};

    this.readyStatus = false;

    //Spawn Flag Detail
    this.posX = 200 + Math.random() * 400;
    this.posY = 200 + Math.random() * 400;
    this.spawnFlagHealth = 500;
    this.playerState = "InGame"; //is currently in game.
  }

  queueSoldierSpawnRequest(soldierType: SoldierType, spawnCount = 1) {
    const lastQueuedRequest = this.SoldierSpawnRequestIdQueue.peekEnd();
    const lastQueuedSoldierType =
      lastQueuedRequest &&
      this.SoldierSpawnRequestDetail[lastQueuedRequest].soldierType;

    let requestId;
    if (lastQueuedSoldierType === soldierType) {
      requestId = lastQueuedRequest;
    } else {
      requestId = uuidv4() as string;
      this.SoldierSpawnRequestIdQueue.enqueue(requestId);
    }

    if (!requestId) {
      return;
    }

    this.SoldierSpawnRequestDetail[requestId] = {
      id: requestId,
      soldierType,
      count:
        (this.SoldierSpawnRequestDetail[requestId]?.count || 0) + spawnCount,
      countdown: this.SoldierSpawnRequestDetail[requestId]?.countdown || 10,
    };
    return this.SoldierSpawnRequestDetail[requestId];
  }

  processPendingSpawnRequests(deltaTime: number) {
    if (this.SoldierSpawnRequestIdQueue.getSize() < 1) return null;

    let requestId = this.SoldierSpawnRequestIdQueue.peekFront();
    if (!requestId) return null;
    let { soldierType } = this.SoldierSpawnRequestDetail[requestId];
    if (!soldierType) return;
    //resources are not sufficient for upcoming spawn
    if (this.resources < SoldierTypeConfig[soldierType].cost) return null;
    this.SoldierSpawnRequestDetail[requestId].countdown = Math.max(
      this.SoldierSpawnRequestDetail[requestId].countdown - deltaTime,
      0
    );

    if (this.SoldierSpawnRequestDetail[requestId].countdown > 0) return null;
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

  setSpawnPoint(x: number, y: number) {
    this.posX = x;
    this.posY = y;
  }

  tick(delta: number, stateManager: GameStateManager) {
    try {
      //if spawnFlag has been destroyed.
      if (this.spawnFlagHealth <= 0) {
        //player already lost the game, simply returns.
        if (this.playerState === "LostGame") return;

        /*
          Schedule a player-lost packet in client queue
          (so server treats it as an update coming from client side)
          The packet's action is defined in PacketActions.js file where further logic is executed.
        */
        this.playerState = "LostGame";
        let playerLostPacket = new Packet(
          PacketType.ByServer.PLAYER_LOST,
          stateManager.getPlayerSocket(this.id),
          {},
          PacketActions.PlayerLostPacketAction
        );
        stateManager.queueClientRequest(playerLostPacket);
        return;
      }

      this.resources += Player.resourceMultiplier * delta;
      this.resources = Math.min(this.resources, Player.maxResources);

      //Queue delta update
      stateManager.enqueueStateUpdate({
        type: PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
        socket: stateManager.getPlayerSocket(this.id),
        playerId: this.id,
        resources: this.resources,
        spawnQueue: this.SoldierSpawnRequestIdQueue.toArray().map(
          (id: string) => this.SoldierSpawnRequestDetail[id]
        ),
      });

      let soldierTypeToSpawn = this.processPendingSpawnRequests(delta);
      if (soldierTypeToSpawn) {
        let createStatus = stateManager.createSoldier(
          this.posX,
          this.posY,
          soldierTypeToSpawn,
          this.id
        );
        if (!createStatus) {
          return;
        }
        let updatePacket: any = {
          type: PacketType.ByServer.SOLDIER_CREATE_ACK,
          isCreated: createStatus.status,
        };
        if (createStatus.status) {
          updatePacket = {
            ...updatePacket,
            soldier: createStatus.soldier!.getSnapshot(),
            playerId: this.id, //person who created soldier
            soldierType: soldierTypeToSpawn,
          };
        }
        stateManager.enqueueStateUpdate(updatePacket);
      }

      let soldiersIdArr = [...this.SoldierMap.keys()];
      for (let i = 0; i < soldiersIdArr.length; i++) {
        let soldierObject = this.SoldierMap.get(soldiersIdArr[i]);
        if (!soldierObject) continue;
        soldierObject.tick(delta, stateManager);
      }
    } catch (err) {
      console.error(err);
    }
  }
  getSnapshot() {
    //get snapshot for each soldier
    var soldierSnapshots: SoldierSnapshot[] = [];
    if (this.SoldierMap.size > 0) {
      const soldierMapVal = this.SoldierMap.values();
      for (const soldier of soldierMapVal) {
        soldierSnapshots.push(soldier.getSnapshot());
      }
    }
    return {
      name: this.name,
      id: this.id,
      resources: this.resources,
      posX: this.posX,
      posY: this.posY,
      spawnPointHealth: this.spawnFlagHealth,
      readyStatus: this.readyStatus,
      soldiers: soldierSnapshots,
      color: [...this.color],
      spawnRequests: this.SoldierSpawnRequestIdQueue.toArray().map(
        (requestId) => this.SoldierSpawnRequestDetail[requestId]
      ),
    };
  }
  createSoldier(type: SoldierType, x: number, y: number) {
    x = this.posX;
    y = this.posY;
    type = type || SoldierType.SPEARMAN;
    if (this.resources < SoldierTypeConfig[type].cost) return { status: false };
    let s = new Soldier(
      type,
      {
        x,
        y,
        health: 100,
        speed: 5,
        cost: SoldierTypeConfig[type].cost,
        damage: 5,
        playerId: this.id,
      },
      this
    );
    this.resources -= SoldierTypeConfig[type].cost;
    this.SoldierMap.set(s.id, s);
    return { status: true, soldierId: s.id, soldier: s };
  }
  getSoldier(soldierId?: string) {
    if (!soldierId) return null;
    return this.SoldierMap.get(soldierId);
  }

  removeSoldier(id: string, stateManager: GameStateManager) {
    let soldierToRemove = this.SoldierMap.get(id);
    if (typeof soldierToRemove === "undefined") return false;
    stateManager.scene.remove(soldierToRemove);
    this.SoldierMap.delete(id);
    return true;
  }

  destroy(stateManager: GameStateManager) {
    this.SoldierMap.forEach((soldier) => {
      stateManager.scene.remove(soldier);
    });
    this.SoldierMap = new Map();
  }
}
