// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
export class OnSoldierCreateCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({ client, message, gameManager }: CommandPayload) {
    try {
      if (process.env.NODE_ENV === "development") {
        this.state
          .getPlayer(client.id)
          ?.addNewSoldier("SPEARMAN", gameManager!.scene);
        return;
      }
      let lengthBefore = this.state.getPlayer(client.id)?.spawnRequestDetailMap
        .size;
      this.state.getPlayer(client.id)?.queueSpawnRequest(message.soldierType);
      let lengthAfter = this.state.getPlayer(client.id)?.spawnRequestDetailMap
        .size;
      console.log(`added to queue ${lengthAfter} <-- ${lengthBefore}`);
    } catch (error) {
      console.error(error);
    }
  }
}
