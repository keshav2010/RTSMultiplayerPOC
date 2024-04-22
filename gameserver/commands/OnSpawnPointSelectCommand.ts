// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnSpawnPointSelectCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{ spawnX: number; spawnY: number }>) {
    const { spawnX, spawnY } = message;
    const player = this.state.getPlayer(client.id);
    player?.updatePosition(spawnX, spawnY);
  }
}
