import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { SERVER_CONFIG } from "../config";
export class OnPlayerReadyCommand extends Command<SessionRoom, CommandPayload> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    readyStatus: boolean;
  }>) {
    console.log("player ready", message);
    const player = this.state.getPlayer(client.sessionId);
    if (!player) return;
    player.readyStatus = message.readyStatus;

    console.log(
      `Threshold : ${this.state.countReadyPlayers()} / ${
        SERVER_CONFIG.MINIMUM_PLAYERS_PER_SESSION
      }`
    );
    if (
      this.state.countReadyPlayers() >= SERVER_CONFIG.MINIMUM_PLAYERS_PER_SESSION
    ) {
      gameManager?.stateMachine.controller.send("StartMatch");
    }
  }
}
