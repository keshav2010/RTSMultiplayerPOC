import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { SoldierState } from "../schema/SoldierState";

export type CommandPayload = {
  client: Client;
  message: any;
  gameManager?: GameStateManager<SoldierState>;
};
