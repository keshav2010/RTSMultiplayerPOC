import SAT from "sat";
import { BaseSoldier } from "./soldiers/BaseSoldier";
export class Player {
  type: string;
  soldiers: Set<BaseSoldier>;
  spawnPosVec: SAT.Vector;
  name: string;
  playerId: string;
  color: number[];
  health: number;
  constructor(prop: {
    posX: number;
    posY: number;
    name: string;
    id: string;
    color: number[];
    spawnPointHealth: number;
  }) {
    this.type = "PLAYER";
    this.soldiers = new Set();
    this.spawnPosVec = new SAT.Vector(prop.posX, prop.posY);
    this.name = prop.name;
    this.playerId = prop.id;
    this.color = [...prop.color];
    this.health = prop.spawnPointHealth;
  }
  setSpawnPoint(x: number, y: number) {
    this.spawnPosVec = new SAT.Vector(x, y);
  }
  getSpawnPoint() {
    return this.spawnPosVec;
  }
  update(deltaTime: number) {
    this.soldiers.forEach((child) => child.update(deltaTime));
  }
  //create a soldier game object and add it to this group
  addSoldier(soldierObject: BaseSoldier) {
    soldierObject.playerId = this.playerId;
    this.soldiers.add(soldierObject);
  }
  getSoldiers() {
    return [...this.soldiers];
  }
  getSoldier(id: string) {
    return this.getSoldiers().filter((child) => child.id === id);
  }
  //remove a soldier object from the group
  removeSoldier(soldierObject: BaseSoldier) {
    this.soldiers.delete(soldierObject);
    soldierObject.destroy();
  }
}
