// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { Client } from "colyseus";
import { nanoid } from "nanoid";
import { CommandPayload } from "./CommandPayloadType";
export class OnJoinCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    const sessionId = client.sessionId;
    console.log("Player Joined", message);
    const playerState = this.state.addPlayer(
      sessionId,
      message?.playerName || `Player_${nanoid()}`,
      message?.x || 0,
      message?.y || 0
    );
    if (!playerState) return;
    gameManager?.addPlayer(playerState);
  }
}
