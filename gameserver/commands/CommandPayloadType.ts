import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { SoldierState } from "../schema/SoldierState";
import { PlayerState } from "../schema/PlayerState";

export type CommandPayload<messageType = any> = {
  client: Client;
  message: messageType;
  gameManager?: GameStateManager<SoldierState, PlayerState>;
};
