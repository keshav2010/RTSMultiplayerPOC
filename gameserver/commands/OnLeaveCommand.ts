// OnJoinCommand.ts
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { CommandPayload } from "./CommandPayloadType";
import { PacketType } from "../../common/PacketType";
import { PlayerState } from "../schema/PlayerState";
export class OnLeaveCommand extends Command<SessionRoom, CommandPayload> {
  execute({ client, message, gameManager }: CommandPayload) {
    const sessionId = client.sessionId;
    this.state.removePlayer(sessionId, gameManager!);
    const winner = gameManager?.playerMap.values().next().value;
    if(this.state.players.size === 1) {
      this.room.broadcast(PacketType.ByServer.GAME_OVER, {
        winningPlayerId: winner?.id,
      });
      
      this.room.broadcast(PacketType.ByServer.NEW_CHAT_MESSAGE, {
        message: `Opponents left the game! You've won!`,
        senderName: '[SERVER]',
      });
      return;
    }

    this.room.broadcast(PacketType.ByServer.NEW_CHAT_MESSAGE, {
      message: `${winner?.name} left the game.`,
      senderName: '[SERVER]',
    });
  }
}
