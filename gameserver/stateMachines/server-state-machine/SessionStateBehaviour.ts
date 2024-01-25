import { Soldier } from "../../Objects/Soldier";
import { GameStateManager } from "../../core/GameStateManager";
import { SessionState } from "../../schema/SessionState";

export default {
  SessionLobbyState: (
    {
      gameStateManager,
      delta,
    }: {
      gameStateManager: GameStateManager<Soldier>;
      delta: number;
    },
    sessionState: SessionState
  ) => {
    const deltaTime = delta / 1000;
    if (sessionState.sessionState !== "SESSION_LOBBY_STATE")
      sessionState.sessionState = "SESSION_LOBBY_STATE";
    if (
      sessionState.players.size >=
      Number(process.env.MINIMUM_PLAYERS_PER_SESSION)
    ) {
      sessionState.countdown -= deltaTime;
      sessionState.countdown = Math.max(0, sessionState.countdown);
      if (sessionState.countdown <= 0) {
        sessionState.countdown = Number(process.env.COUNTDOWN);
        gameStateManager.stateMachine.controller.send("StartMatch");
      }
    } else {
      sessionState.countdown = 5;
    }
  },

  SpawnSelectionState: (
    {
      gameStateManager,
      delta,
    }: {
      gameStateManager: GameStateManager<Soldier>;
      delta: number;
    },
    sessionState: SessionState
  ) => {
    try {
      if (sessionState.sessionState !== "SPAWN_SELECTION_STATE")
        sessionState.sessionState = "SPAWN_SELECTION_STATE";
      //in seconds
      const deltaTime = delta / 1000;
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

  BattleState: (
    {
      gameStateManager,
      delta,
    }: {
      gameStateManager: GameStateManager<Soldier>;
      delta: number;
    },
    sessionState: SessionState
  ) => {
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
        player.tick(deltaTime, gameStateManager);
      });
    } catch (err) {
      console.log(err);
    }
  },

  BattleEndState: (
    {
      gameStateManager,
      delta,
    }: {
      gameStateManager: GameStateManager<Soldier>;
      delta: number;
    },
    sessionState: SessionState
  ) => {},
};
