// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnLeaveCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message }: { client: Client; message: any }) {
    const sessionId = client.sessionId;
    this.state.removePlayer(sessionId);
    console.log(`[OnLeaveCommand]: Removed player. ${message.name}`);
  }
}
