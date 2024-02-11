import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnPlayerReadyCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    console.log("player ready", message);
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;
    player.readyStatus = message.readyStatus;
  }
}
