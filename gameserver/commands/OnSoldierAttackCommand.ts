// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { CommandPayload } from "./CommandPayloadType";
import { SoldierState } from "../schema/SoldierState";
export class OnSoldierAttackCommand extends Command<
  SessionRoom,
  CommandPayload
> {
  execute({
    client,
    message,
    gameManager,
  }: CommandPayload<{
    soldiers: string[];
    targetPlayerId: string;
    targetSoldierId: string;
  }>) {
    const attacker = this.state.getPlayer(client.id);
    const victim = this.state.getPlayer(message.targetPlayerId);
    if (!attacker || !victim) {
      return;
    }
    const targetSoldier = victim.getSoldier(message.targetSoldierId);
    if (!targetSoldier) {
      return;
    }

    const attackerUnits = attacker
      .getAllSoldiers()
      .filter((soldier) => message.soldiers.includes(soldier.id));
    attackerUnits.forEach((unit: SoldierState) => {
      unit.attackUnit(targetSoldier, gameManager!);
    });
  }
}
