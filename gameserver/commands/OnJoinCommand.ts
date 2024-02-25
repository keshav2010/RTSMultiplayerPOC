// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { nanoid } from "nanoid";
import { CommandPayload } from "./CommandPayloadType";
export class OnJoinCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    console.log(message);
    const sessionId = client.sessionId;
    console.log(message);
    this.state.addPlayer(
      sessionId,
      message?.name || `Player_${nanoid()}`,
      message?.x || 0,
      message?.y || 0
    );
  }
}
