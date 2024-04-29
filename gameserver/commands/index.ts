import { OnPlayerReadyCommand } from "./OnPlayerReadyCommand";
import { PacketType } from "../../common/PacketType";
import { OnSpawnSoldierCommand } from "./OnSpawnSoldierCommand";
import { OnSoldierCreateCommand } from "./OnSoldierCreateCommand";
import { Command } from "@colyseus/command";
import { SessionRoom } from "../SessionRoom";
import { OnSoldierDeleteCommand } from "./OnSoldierDeleteCommand";
import { OnSoldierMoveCommand } from "./OnSoldierMoveCommand";
import { OnSoldierAttackCommand } from "./OnSoldierAttackCommand";
import { OnSpawnPointSelectCommand } from "./OnSpawnPointSelectCommand";
import { CommandPayload } from "./CommandPayloadType";
import { OnChatBroadcastCommand } from "./OnChatBroadcastCommand";

export class CommandFactory {
  static createCommand(
    type: string
  ): Command<SessionRoom, CommandPayload> | null {
    switch (type) {
      case PacketType.ByClient.PLAYER_READY:
      case PacketType.ByClient.PLAYER_UNREADY:
        return new OnPlayerReadyCommand();

      case PacketType.ByClient.SOLDIER_CREATE_REQUESTED:
        return new OnSoldierCreateCommand();

      case PacketType.ByClient.SOLDIER_SPAWN_REQUESTED:
        return new OnSpawnSoldierCommand();

      case PacketType.ByClient.SOLDIER_DELETED:
        return new OnSoldierDeleteCommand();

      case PacketType.ByClient.SOLDIER_MOVE_REQUESTED:
        return new OnSoldierMoveCommand();

      case PacketType.ByClient.SOLDIER_ATTACK_REQUESTED:
        return new OnSoldierAttackCommand();

      case PacketType.ByClient.SPAWN_POINT_REQUESTED:
        return new OnSpawnPointSelectCommand();
      case PacketType.ByClient.CLIENT_SENT_CHAT:
        return new OnChatBroadcastCommand();
      default:
        return null;
    }
  }
}
