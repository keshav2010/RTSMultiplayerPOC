// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { Soldier } from "../Objects/Soldier";
import { CommandPayload } from "./CommandPayloadType";
export class OnSoldierCreateCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message }: { client: Client; message: any }) {}
}
