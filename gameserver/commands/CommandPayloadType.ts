import { Client } from "colyseus";
import { GameStateManager } from "../core/GameStateManager";
import { Soldier } from "../Objects/Soldier";

export type CommandPayload = {
  client: Client;
  message: any;
  gameManager ?: GameStateManager<Soldier>;
};
