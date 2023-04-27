const PacketType = require("../../../common/PacketType");
module.exports = {
  SessionLobbyState: ({ gameStateManager }) => {
    var deltaTime =
    (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
    gameStateManager.lastSimulateTime_ms = Date.now();
    if(gameStateManager.getPlayers().length >= process.env.MINIMUM_PLAYERS_PER_SESSION) {
      gameStateManager.countdown -= deltaTime;
      gameStateManager.countdown = Math.max(0, gameStateManager.countdown);
      gameStateManager.enqueueStateUpdate({
        type: PacketType.ByServer.COUNTDOWN_TIME,
        time: gameStateManager.countdown,
      });
      if (gameStateManager.countdown <= 0) {
        gameStateManager.countdown = process.env.COUNTDOWN;
        gameStateManager.stateMachine.controller.send("StartMatch");
      }
    }
    else {
      gameStateManager.countdown = 5;
    }
  },
  SpawnSelectionState: ({ gameStateManager }) => {
    try {
      if(!gameStateManager.GameStarted) {
        gameStateManager.startGame();
      }
      //in seconds
      var deltaTime =
        (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
      gameStateManager.lastSimulateTime_ms = Date.now();
      gameStateManager.countdown -= deltaTime;
      gameStateManager.countdown = Math.max(0, gameStateManager.countdown);
      
      gameStateManager.enqueueStateUpdate({
        type: PacketType.ByServer.COUNTDOWN_TIME,
        time: gameStateManager.countdown,
      });
      if (gameStateManager.countdown <= 0) {
        console.log("countdown completed for spawn-selection");
        gameStateManager.stateMachine.controller.send("TIMEOUT");
      }
    } catch (err) {
      console.log(err);
    }
  },

  BattleState: ({ gameStateManager }) => {
    try {
      var deltaTime =
        (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
      gameStateManager.lastSimulateTime_ms = Date.now();
      //simulate all players.
      const playersConnected = gameStateManager.getPlayers();
      if(playersConnected.length == 0) {
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

  BattleEndState: ({ gameStateManager }) => {
  },
};
