import { GameStateManager } from "../../core/GameStateManager";
import { SessionState } from "../../schema/SessionState";
import { SoldierState } from "../../schema/SoldierState";

export default {
  SessionLobbyState: ({
    gameStateManager,
    delta,
    sessionState,
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
  }) => {
    const deltaTime = delta;
    if (sessionState.sessionState !== "SESSION_LOBBY_STATE")
      sessionState.sessionState = "SESSION_LOBBY_STATE";

    if (
      sessionState.players.size >=
      Number(process.env.MINIMUM_PLAYERS_PER_SESSION)
    ) {
      sessionState.countdown -= deltaTime;
      sessionState.countdown = Math.max(0, sessionState.countdown);
      if (sessionState.countdown <= 0) {
        console.log("session-lobby-state timed out, starting match/game");
        sessionState.countdown = Number(process.env.COUNTDOWN_SPAWN_SELECTION);
        gameStateManager.stateMachine.controller.send("StartMatch");
      }
      return;
    }

  },

  SpawnSelectionState: ({
    gameStateManager,
    delta,
    sessionState,
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
  }) => {
    try {
      if (sessionState.sessionState !== "SPAWN_SELECTION_STATE")
        sessionState.sessionState = "SPAWN_SELECTION_STATE";
      //in seconds
      const deltaTime = delta;
      sessionState.countdown -= deltaTime;
      sessionState.countdown = Math.max(0, sessionState.countdown);

      if (sessionState.countdown <= 0) {
        console.log("countdown completed for spawn-selection");
        gameStateManager.stateMachine.controller.send("TIMEOUT");
      }
    } catch (err) {
      console.log(err);
    }
  },

  BattleState: ({
    gameStateManager,
    delta,
    sessionState,
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
  }) => {
    try {
      if (sessionState.sessionState !== "BATTLE_STATE")
        sessionState.sessionState = "BATTLE_STATE";
      var deltaTime = delta / 1000;

      //simulate all players.
      const playersConnected = sessionState.players;
      if (playersConnected.size == 0) {
        gameStateManager.stateMachine.controller.send("BattleEnd");
        return;
      }
      playersConnected.forEach((player) => {
        player.tick(deltaTime);
      });
    } catch (err) {
      console.log(err);
    }
  },

  BattleEndState: ({
    gameStateManager,
    delta,
    sessionState,
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
  }) => {},
};
