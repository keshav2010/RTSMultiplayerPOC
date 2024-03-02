import { Room } from "colyseus";
import { GameStateManager } from "../../core/GameStateManager";
import { SessionState } from "../../schema/SessionState";
import { SoldierState } from "../../schema/SoldierState";
import { SERVER_CONFIG } from "../../config";

export default {
  SessionLobbyState: async ({
    gameStateManager,
    delta,
    sessionState,
    room
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
    room : Room;
  }) => {
    const deltaTime = delta;
    if (sessionState.sessionState !== "SESSION_LOBBY_STATE"){
      sessionState.sessionState = "SESSION_LOBBY_STATE";
      await room.unlock();
    } 
    if (sessionState.players.size >= SERVER_CONFIG.MINIMUM_PLAYERS_PER_SESSION) {
      sessionState.countdown -= deltaTime;
      sessionState.countdown = Math.max(0, sessionState.countdown);
      if (sessionState.countdown <= 0) {
        console.log("session-lobby-state timed out, starting match/game");
        sessionState.countdown = SERVER_CONFIG.COUNTDOWN_SPAWN_SELECTIONS;
        gameStateManager.stateMachine.controller.send("StartMatch");
      }
      return;
    }

  },

  SpawnSelectionState: async ({
    gameStateManager,
    delta,
    sessionState,
    room
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
    room : Room;
  }) => {
    try {
      if (sessionState.sessionState !== "SPAWN_SELECTION_STATE"){
        sessionState.sessionState = "SPAWN_SELECTION_STATE";
        sessionState.countdown = SERVER_CONFIG.COUNTDOWN_SPAWN_SELECTIONS;
        await room.unlock();
      }
      //in seconds
      const deltaTime = delta;
      sessionState.countdown -= deltaTime;
      sessionState.countdown = Math.max(0, sessionState.countdown);

      if (sessionState.countdown <= 0) {
        console.log("countdown completed for spawn-selection");
        await room.lock();
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
    room
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
    room : Room;
  }) => {
    try {
      if (sessionState.sessionState !== "BATTLE_STATE"){
        room.lock();
        sessionState.sessionState = "BATTLE_STATE";
      }
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

  BattleEndState: ({
    gameStateManager,
    delta,
    sessionState,
  }: {
    gameStateManager: GameStateManager<SoldierState>;
    delta: number;
    sessionState: SessionState;
    tick : Room;
  }) => {},
};
