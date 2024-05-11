import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { SERVER_CONFIG } from "../config";
export class OnPlayerLoadedCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    isLoaded: boolean;
  }>) {
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;
    console.log(`Player Loaded `, player.id, message);
    player.isLoaded = message.isLoaded;
  }
}
