// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";

interface ICaptureFlagDelete {
  flagId: string;
}

export class OnCaptureFlagDeleteCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<ICaptureFlagDelete>) {
    try {
      const sessionState = this.state;
      gameManager
        ?.getPlayer(client.id)
        ?.removeCaptureFlag(message.flagId, sessionState);
    } catch (error) {
      console.error(error);
    }
  }
}
