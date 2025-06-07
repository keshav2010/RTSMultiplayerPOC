// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { PacketType } from "../../common/PacketType";

export class OnPingCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    const sessionId = client.sessionId;
    client.send(PacketType.ByServer.PONG_RESPONSE, {});
  }
}
