// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
export class OnSoldierMoveCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message }: { client: Client; message: any }) {
    console.log('Soldier Move Command Requested', message);
  }
}
