// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import SAT from "sat";
export class OnSoldierMoveCommand extends Command<SessionRoom, CommandPayload> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    soldierIds: string[];
    expectedPositionX: number;
    expectedPositionY: number;
  }>) {
    message.soldierIds.forEach((soldierId) => {
      const player = this.state.getPlayer(client.sessionId);
      if (!player) {
        return;
      }
      const soldier = player.getSoldier(soldierId);

      if (!soldier) {
        return;
      }
      soldier.setTargetPosition(
        new SAT.Vector(message.expectedPositionX, message.expectedPositionY)
      );
    });
  }
}
