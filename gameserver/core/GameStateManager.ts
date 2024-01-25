import { AllianceTracker, AllianceTypes } from "../AllianceTracker";
import { Scene } from "./Scene";
import { IMachineJSON, IStateActions, StateMachine } from "./StateMachine";
import { SceneObject } from "./SceneObject";
import { SessionState } from "../schema/SessionState";

/**
 * Manages entire game state.
 */
export class GameStateManager<SceneItemType extends SceneObject> {
  GameStarted: boolean;
  scene: Scene<SceneItemType>;
  countdown: number;
  stateMachine: StateMachine;
  alliances: AllianceTracker;
  onGameStartCallback: (() => void) | null | undefined;
  onGameEndCallback: (() => void) | null | undefined;
  sessionId: string | null;
  constructor(
    sessionStateMachineJSON: IMachineJSON,
    sessionStateMachineActions: IStateActions
  ) {
    this.sessionId = null;

    this.GameStarted = false;

    this.scene = new Scene<SceneItemType>({
      width: 15,
      height: 15,
    });

    this.countdown = Number(process.env.COUNTDOWN) || 10; //seconds
    this.stateMachine = new StateMachine(
      sessionStateMachineJSON,
      sessionStateMachineActions
    );
    this.alliances = new AllianceTracker();
  }

  tick(delta: number, state: SessionState) {
    const args = {
      gameStateManager: this,
      delta,
    };
    this.stateMachine.tick(args, state);
  }

  addSceneItem(item: SceneItemType) {
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
