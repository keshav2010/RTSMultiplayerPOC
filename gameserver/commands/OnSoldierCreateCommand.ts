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
    console.log('received soldier create request, queueing');
    let lengthBefore = this.state.getPlayer(client.id)?.spawnRequestDetailMap.size;
    this.state.getPlayer(client.id)?.queueSpawnRequest(message.soldierType);
    let lengthAfter = this.state.getPlayer(client.id)?.spawnRequestDetailMap.size;
    console.log(`added to queue ${lengthAfter} <-- ${lengthBefore}`)
  }
}
