// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import SAT from "sat";
import { SoldierState } from "../schema/SoldierState";
import { GroupFormation } from "../GroupFormation";

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
    try {
      const sceneSize = gameManager?.scene.getDimension();
      if (!sceneSize) {
        throw new Error(`sceneSize not found`);
      }
      const soldierObjects = message.soldierIds
        .map((id) => this.state.getPlayer(client.sessionId)?.getSoldier(id))
        .filter(Boolean) as SoldierState[];
      if (soldierObjects.length === 0) return;
      const offset = 96;
      const gridFormation = new GroupFormation(
        soldierObjects,
        offset,
        new SAT.Box(new SAT.Vector(), sceneSize.x, sceneSize.y)
      );
      gridFormation.calculatePositions(
        new SAT.Vector(message.expectedPositionX, message.expectedPositionY)
      );
    } catch (error) {
      console.error(error);
    }
  }
}
