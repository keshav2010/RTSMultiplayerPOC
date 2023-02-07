const PacketType = require("../../../common/PacketType");
module.exports = {
    SpawnSelectionState: ({gameStateManager}) => {
        try {
          //in seconds
          var deltaTime = (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
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
    
      BattleState: ({gameStateManager}) => {
        try {
          var deltaTime = (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
          gameStateManager.lastSimulateTime_ms = Date.now();
          //simulate all players.
          gameStateManager.getPlayers().forEach(player => {
            player.tick(deltaTime, gameStateManager);
          });
        } catch (err) {
          console.log(err);
        }
      },
    
      BattleEndState: ({gameStateManager}) => {

      }
}