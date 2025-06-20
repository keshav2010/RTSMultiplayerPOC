// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { PacketType } from "../../common/PacketType";

interface IChatBroadcast {
  sessionId: string;
  message: string;
}
export class OnChatBroadcastCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message, gameManager }: CommandPayload<IChatBroadcast>) {
    const sessionId = client.sessionId;
    const sender = gameManager?.getPlayer(sessionId);

    this.room.broadcast(PacketType.ByServer.NEW_CHAT_MESSAGE, {
      sender: sessionId, 
      senderName: sender?.name,
      message: message.message,
    });
  }
}
