// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { Client } from "colyseus";
import { nanoid } from "nanoid";
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
    name: string;
    x: number;
    y: number;
  }>) {
    const sessionId = client.sessionId;
    this.state.addPlayer(
      sessionId,
      message.name,
      message?.x || 0,
      message?.y || 0
    );
    console.log(`[OnChatBroadcastCommand]: Added player. ${message.name}`);
  }
}
