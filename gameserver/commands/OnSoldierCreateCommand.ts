// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { CommandPayload } from "./CommandPayloadType";
export class OnSoldierCreateCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message }: { client: Client; message: any }) {
    this.state.getPlayer(client.id)?.queueSpawnRequest(message.soldierType);
  }
}
