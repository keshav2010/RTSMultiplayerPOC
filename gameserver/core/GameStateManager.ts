import { AllianceTracker, AllianceTypes } from "../AllianceTracker";
import { Scene, ISceneItem } from "./Scene";
import {
  IMachineJSON,
  IStateActions,
  CustomStateMachine,
} from "./CustomStateMachine";
import { SessionState } from "../schema/SessionState";

/**
 * Manages entire game state.
 */
export class GameStateManager<SceneItemType extends ISceneItem> {
  GameStarted: boolean;
  scene: Scene<SceneItemType>;
  countdown: number;
  stateMachine: CustomStateMachine<{
    gameStateManager: GameStateManager<SceneItemType>;
    delta: number;
    sessionState: SessionState;
  }>;
  alliances: AllianceTracker;
  onGameStartCallback: (() => void) | null | undefined;
  onGameEndCallback: (() => void) | null | undefined;
  onSceneItemRemoved: null | ((arg: SceneItemType) => void) = null;

  constructor(
    sessionStateMachineJSON: IMachineJSON,
    sessionStateMachineActions: IStateActions,
    onSceneItemRemoved?: (arg: SceneItemType) => void
  ) {
    this.GameStarted = false;
    this.onSceneItemRemoved = onSceneItemRemoved || null;
    this.scene = new Scene({
      width: 15,
      height: 15,
    });

    this.countdown = Number(process.env.COUNTDOWN) || 10000; //seconds
    this.stateMachine = new CustomStateMachine<{
      gameStateManager: GameStateManager<SceneItemType>;
      delta: number;
      sessionState: SessionState;
    }>(sessionStateMachineJSON, sessionStateMachineActions);
    this.alliances = new AllianceTracker();
  }

  tick(delta: number, sessionState: SessionState) {
    const args = {
      gameStateManager: this,
      delta,
      sessionState,
    };
    this.stateMachine.tick(args);
  }

  addSceneItem(item: SceneItemType) {
    this.scene.addSceneItem(item);
  }
  removeSceneItem(itemId: string) {
    this.scene.removeSceneItem(itemId);
  }

  removeSoldier(unit: SceneItemType) {
    const isRemoved = this.scene.remove(unit.getSceneItem().getQuadtreeItem());
    if (isRemoved && this.onSceneItemRemoved) {
      this.onSceneItemRemoved(unit);
    }
    return isRemoved;
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
