// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import { SoldierType } from "../../common/SoldierType";
export class OnSpawnSoldierCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    unitType: SoldierType;
  }>) {
    this.state
      .getPlayer(client.id)
      ?.addNewSoldier(message.unitType, gameManager!.scene);
  }
}
