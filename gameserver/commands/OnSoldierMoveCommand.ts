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
    const sceneSize = gameManager?.scene.getDimension();
    if (!sceneSize) return;

    const soldierObjects = message.soldierIds
      .map((id) => this.state.getPlayer(client.sessionId)?.getSoldier(id))
      .filter(Boolean) as SoldierState[];

    if (soldierObjects.length === 0) return;

    // leader selection for group movement
    const leader = soldierObjects[0];
    for (let i = 1; i < soldierObjects.length; i++) {
      soldierObjects[i].setGroupLeaderId(leader.id);
    }

    // create formation centered at expectedPosition
    const matrixRows = Math.ceil(Math.sqrt(soldierObjects.length));
    const offset = 96;
    let expectedPosition = new SAT.Vector(
      message.expectedPositionX,
      message.expectedPositionY
    );

    const boundingBoxWidth = matrixRows * offset;
    const boundingBoxHeight = boundingBoxWidth;

    const formationBoundingBox = new SAT.Box(
      expectedPosition,
      boundingBoxWidth,
      boundingBoxHeight
    )
      .toPolygon()
      .translate(
        expectedPosition.x - boundingBoxWidth + offset / 2,
        expectedPosition.y - boundingBoxHeight + offset / 2
      );
    console.log(matrixRows);
    expectedPosition = formationBoundingBox.getCentroid();

    const soldiersOffset = new Map<string, SAT.Vector>();
    soldierObjects.forEach((soldier, i) => {
      const row = Math.floor(i / matrixRows) * offset;
      const col = (i % matrixRows) * offset;
      soldiersOffset.set(soldier.id, new SAT.Vector(col, row));
    });

    // expected position will also be assigned in an order to maintain group formation
    soldierObjects.forEach((soldier) => {
      const targetPos = expectedPosition
        .clone()
        .add(soldiersOffset.get(soldier.id)!);
      soldier.setTargetPosition(targetPos);
    });
  }
}
