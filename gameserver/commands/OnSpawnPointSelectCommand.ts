// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import SAT from 'sat';
export class OnSpawnPointSelectCommand extends Command<SessionRoom, CommandPayload> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{ spawnX: number; spawnY: number }>) {
    const { spawnX, spawnY } = message;
    const requestedPoint = new SAT.Vector(spawnX, spawnY);

    const castleSize = 64;

    const dimensions = gameManager?.scene.getDimension();
    if (!dimensions) return;

    const sceneBoundingBox = new SAT.Box(
      new SAT.Vector(0, 0).add(new SAT.Vector(castleSize, castleSize)),
      dimensions.x - castleSize * 2,
      dimensions.y - castleSize * 2
    );
    
    const pointInPolygon = SAT.pointInPolygon(requestedPoint, sceneBoundingBox.toPolygon())
    if (!pointInPolygon) {
      return;
    }
    const player = this.state.getPlayer(client.id);
    player?.updatePosition(spawnX, spawnY);
  }
}
