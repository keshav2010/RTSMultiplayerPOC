import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
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

    console.log(`Players Ready = ${this.state.countReadyPlayers()}`);
    console.log(
      `Threshold : ${Number(process.env.MINIMUM_PLAYERS_PER_SESSION)}`
    );
    if (
      this.state.countReadyPlayers() >=
      Number(process.env.MINIMUM_PLAYERS_PER_SESSION)
    ) {
      gameManager?.stateMachine.controller.send("StartMatch");
    }
  }
}
