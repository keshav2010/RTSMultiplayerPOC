// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnPlayerJoinCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {}
}
