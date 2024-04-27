// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { nanoid } from "nanoid";
import { CommandPayload } from "./CommandPayloadType";
import * as helper from '../helpers';
import SAT from 'sat';
export class OnJoinCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    const sessionId = client.sessionId;
    const playerPos = new SAT.Vector(
      (Math.random() * gameManager?.scene.getDimension().x!),
      (Math.random() * gameManager?.scene.getDimension().y!)
    );

    const clampedPos = helper.clampVector(
      playerPos,
      new SAT.Vector(100,100),
      gameManager!.scene.getDimension()!.clone().sub(new SAT.Vector(100,100))
    );
    const playerState = this.state.addPlayer(
      sessionId,
      message?.playerName || `Player_${nanoid()}`,
      clampedPos.x,
      clampedPos.y,
    );
    if (!playerState) return;
    gameManager?.addPlayer(playerState);
  }
}
