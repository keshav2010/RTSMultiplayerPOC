// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import SAT from "sat";
import { SoldierState } from "../schema/SoldierState";
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
    const soldierObjects = message.soldierIds
      .map((id) => this.state.getPlayer(client.sessionId)?.getSoldier(id))
      .filter(Boolean) as SoldierState[];
    if (soldierObjects.length === 0) {
      return;
    }

    // leader selection for group movement
    const leader = soldierObjects[0];
    for (let i = 1; i < soldierObjects.length; i++) {
      soldierObjects[i].setGroupLeaderId(leader.id);
    }

    // update relative position of group units (leader will be assigned center slot in group grid)
    const matrixRows = Math.ceil(Math.sqrt(soldierObjects.length));
    const offset = 80;
    soldierObjects.forEach((soldier, i) => {
      const offsetX = (i % matrixRows) * offset;
      const offsetY = Math.floor(i / matrixRows) * offset;
      soldier.offsetFromPosition = new SAT.Vector(offsetX, offsetY);
    });

    // expected position will also be assigned in an order to maintain group formation
    soldierObjects.forEach((soldier) => {
      const targetPos = new SAT.Vector(
        message.expectedPositionX + soldier.offsetFromPosition.x,
        message.expectedPositionY + soldier.offsetFromPosition.y
      );
      soldier.setTargetPosition(targetPos);
    });
  }
}
