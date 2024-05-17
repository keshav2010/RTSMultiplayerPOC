import { Schema, type } from "@colyseus/schema";
import { VectorState } from "./VectorState";
import { nanoid } from "nanoid";

export enum CaptureFlagStatus {
  IN_PROGRESS = "in_progress",
  READY = "ready",
}
export class CaptureFlagState extends Schema {
  // Key : sessionId
  @type("string") flagId = nanoid();
  @type("number") health: number = 100;
  @type(VectorState) pos = new VectorState();
  @type("string") flagState: CaptureFlagStatus = CaptureFlagStatus.IN_PROGRESS;
  msUntilReady: number = 10 * 1000;

  constructor(x: number, y: number) {
    super();
    this.pos = new VectorState(x, y);
    this.flagState = CaptureFlagStatus.IN_PROGRESS;
  }
  tick(delta: number) {
    this.msUntilReady =
      this.msUntilReady > 0 ? Math.max(0, this.msUntilReady - delta) : 0;
    if (
      this.msUntilReady === 0 &&
      this.flagState === CaptureFlagStatus.IN_PROGRESS
    ) {
      this.flagState = CaptureFlagStatus.READY;
    }
  }
}
