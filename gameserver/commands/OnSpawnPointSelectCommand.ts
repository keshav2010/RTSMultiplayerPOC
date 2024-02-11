// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnSpawnPointSelectCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message, gameManager }: CommandPayload) {
    const { spawnX, spawnY } = message;
    console.log("spawn point selected in frontend", spawnX, spawnY);
    const player = this.state.getPlayer(client.id);
    if (!player) return;
    player.posX = spawnX;
    player.posY = spawnY;
  }
}
