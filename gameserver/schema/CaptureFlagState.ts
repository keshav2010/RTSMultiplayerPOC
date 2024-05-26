import { Schema, type } from "@colyseus/schema";
import { VectorState } from "./VectorState";
import { nanoid } from "nanoid";
import { SessionState } from "./SessionState";
import { ISceneItem } from "../core/types/ISceneItem";
import { SceneObject } from "../core/types/SceneObject";

export enum CaptureFlagStatus {
  IN_PROGRESS = "in_progress",
  READY = "ready",
}
export class CaptureFlagState extends Schema implements ISceneItem {
  // Key : sessionId
  static cost: number = 30;
  @type("string") id = nanoid();
  @type("number") health: number = 5;
  @type(VectorState) pos = new VectorState();
  @type("string") flagState: CaptureFlagStatus = CaptureFlagStatus.IN_PROGRESS;
  msUntilReady: number = 10 * 1000;
  sceneItemRef: SceneObject;

  constructor(x: number, y: number) {
    super();
    this.pos = new VectorState(x, y);
    this.sceneItemRef = new SceneObject(this.id, x, y, 64, "CAPTURE_FLAG", false);
  }
  setHealth(health: number) {
    this.health = Math.max(0,health);
  }
  getSceneItem() {
    return this.sceneItemRef;
  }
  tick(delta: number, sessionState: SessionState) {
    if (this.flagState === CaptureFlagStatus.IN_PROGRESS) {
      this.health = Math.min(this.health + delta * 2, 100);
      if (this.health === 100) this.flagState = CaptureFlagStatus.READY;
    }
  }
}
