import { AllianceTracker, AllianceTypes } from "../AllianceTracker";
import { Scene } from "./Scene";
import {
  IMachineJSON,
  IStateActions,
  CustomStateMachine,
} from "./CustomStateMachine";
import { SessionState } from "../schema/SessionState";
import { Room } from "colyseus";
import { SERVER_CONFIG } from "../config";
import { IDfied } from "./types/IDfied";
import { ISceneItem } from "./types/ISceneItem";

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
      width: 1920,
      height: 1920,
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

  addSceneItem(item: ISceneItem, doObserve: boolean = true) {
    this.scene.addSceneItem(item, doObserve);
  }
  removeSceneItem(itemId: string) {
    this.scene.removeSceneItem(itemId);
  }
  getSceneItem<Type extends ISceneItem>(itemId: string) {
    return this.scene.getSceneItemById<Type>(itemId);
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
