// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import SAT from 'sat';
import { PacketType } from "../../common/PacketType";
export class OnSpawnPointSelectCommand extends Command<SessionRoom, CommandPayload> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{ spawnX: number; spawnY: number }>) {
    const { spawnX, spawnY } = message;
    const castleSize = 64;
    const requestedPoint = new SAT.Vector(spawnX - castleSize/2, spawnY - castleSize/2);


    const dimensions = gameManager?.scene.getDimension();
    if (!dimensions) return;

    const sceneBoundingBox = new SAT.Box(
      new SAT.Vector(0, 0).add(new SAT.Vector(castleSize, castleSize)),
      dimensions.x - castleSize * 2,
      dimensions.y - castleSize * 2
    );
    
    const pointInPolygon = SAT.pointInPolygon(requestedPoint, sceneBoundingBox.toPolygon())
    if (!pointInPolygon) {
      client.send(PacketType.ByServer.SPAWN_POINT_RJCT, {
        spawnX,
        spawnY,
      });
      return;
    }
    const player = this.state.getPlayer(client.id);
    player?.updatePosition(requestedPoint.x, requestedPoint.y);
  }
}
