import { Schema, type } from "@colyseus/schema";
import SAT from "sat";
export class VectorState extends Schema {
  // Key : sessionId
  @type("number") x = 0;
  @type("number") y = 0;
  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
  getVector() {
    return new SAT.Vector(this.x, this.y);
  }
  setVector(v: SAT.Vector) {
    this.x = v.x;
    this.y = v.y;
  }
}
