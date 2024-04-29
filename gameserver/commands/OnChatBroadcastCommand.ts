// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { PacketType } from "../../common/PacketType";
export class OnChatBroadcastCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    sessionId: string;
    message: string;
  }>) {
    const sessionId = client.sessionId;
    console.log(`[OnChatBroadcastCommand]: Received Chat.`, message);
    this.room.broadcast(PacketType.ByServer.NEW_CHAT_MESSAGE, {
      sender: sessionId,
      message: message.message,
    });
  }
}
