import { AllianceTracker, AllianceTypes } from "../AllianceTracker";
import { Scene, ISceneItem } from "./Scene";
import {
  IMachineJSON,
  IStateActions,
  CustomStateMachine,
} from "./CustomStateMachine";
import { SessionState } from "../schema/SessionState";
import { Room } from "colyseus";
import { SERVER_CONFIG } from "../config";
import { IDfied } from "./interface/IDfied";

export class GameStateManager<PlayerSchema extends IDfied> {
  GameStarted: boolean;
  scene: Scene;
  countdown: number;
  stateMachine: CustomStateMachine<{
    gameStateManager: GameStateManager<PlayerSchema>;
    delta: number;
    sessionState: SessionState;
    room: Room<any>;
  }>;
  alliances: AllianceTracker;
  onGameStartCallback: (() => void) | null | undefined;
  onGameEndCallback: (() => void) | null | undefined;
  playerMap: Map<string, PlayerSchema>;
  constructor(
    sessionStateMachineJSON: IMachineJSON,
    sessionStateMachineActions: IStateActions
  ) {
    this.GameStarted = false;
    this.scene = new Scene({
      width: 15,
      height: 15,
    });
    this.playerMap = new Map();
    this.countdown = SERVER_CONFIG.COUNTDOWN;
    this.stateMachine = new CustomStateMachine<{
      gameStateManager: GameStateManager<PlayerSchema>;
      delta: number;
      sessionState: SessionState;
    }>(sessionStateMachineJSON, sessionStateMachineActions);
    this.alliances = new AllianceTracker();
  }

  addPlayer(player: PlayerSchema) {
    this.playerMap.set(player.id, player);
  }
  getPlayer(id: string) {
    return this.playerMap.get(id);
  }

  tick(delta: number, sessionState: SessionState, room: Room<any>) {
    const args = {
      gameStateManager: this as GameStateManager<PlayerSchema>,
      delta,
      sessionState,
      room,
    };
    this.stateMachine.tick(args);
  }

  addSceneItem(item: ISceneItem) {
    this.scene.addSceneItem(item);
  }
  removeSceneItem(itemId: string) {
    this.scene.removeSceneItem(itemId);
  }

  setAlliance(
    playerAId: string,
    playerBId: string,
    allianceType: AllianceTypes
  ) {
    this.alliances.setAlliance(playerAId, playerBId, allianceType);
  }

  getAlliance(playerAId: string, playerBId: string) {
    return this.alliances.getAlliance(playerAId, playerBId);
  }
}
