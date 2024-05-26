// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";

interface ICaptureFlagDelete {
  captureFlagIds: string[];
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
        ?.removeBulkCaptureFlag(
          message.captureFlagIds,
          sessionState,
          gameManager
        );
    } catch (error) {
      console.error(error);
    }
  }
}
