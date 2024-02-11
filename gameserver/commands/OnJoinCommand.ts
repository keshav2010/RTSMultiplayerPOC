// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { nanoid } from "nanoid";
import { CommandPayload } from "./CommandPayloadType";
export class OnJoinCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message }: { client: Client; message: any }) {
    console.log(message);
    const sessionId = client.sessionId;
    this.state.addPlayer(
      sessionId,
      message?.name || `Player_${nanoid()}`,
      message?.x || 0,
      message?.y || 0
    );
  }
}
