// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnSoldierDeleteCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    soldierIds: string[];
  }>) {
    const sessionId = client.sessionId;
    message.soldierIds.forEach((id) =>
      this.state.getPlayer(sessionId)?.removeSoldier(id, gameManager!)
    );
  }
}
