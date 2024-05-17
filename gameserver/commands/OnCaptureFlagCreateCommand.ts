// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";

interface ICaptureFlagCreate {
  x: number;
  y: number;
}

export class OnCaptureFlagCreateCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<ICaptureFlagCreate>) {
    try {
      const sessionState = this.state;
      gameManager
        ?.getPlayer(client.id)
        ?.createCaptureFlag(message.x, message.y, sessionState);
    } catch (error) {
      console.error(error);
    }
  }
}
