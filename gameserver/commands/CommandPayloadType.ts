import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { SoldierState } from "../schema/SoldierState";

export type CommandPayload<messageType = any> = {
  client: Client;
  message: messageType;
  gameManager ?: GameStateManager<SoldierState>;
};
