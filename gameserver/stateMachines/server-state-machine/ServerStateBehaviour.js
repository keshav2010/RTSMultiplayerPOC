const PacketType = require("../../../common/PacketType");
const nbLoop = require("../../../common/nonBlockingLoop");
module.exports = {
    SpawnSelectionState: ({gameStateManager}) => {
        try {
          //in seconds
          var deltaTime = (Date.now() - gameStateManager.lastSimulateTime_ms) / 1000;
          gameStateManager.lastSimulateTime_ms = Date.now();
          gameStateManager.countdown -= deltaTime;
          gameStateManager.countdown = Math.max(0, gameStateManager.countdown);
          gameStateManager.pendingUpdates.queueServerEvent({
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
          let playerIdArray = [...gameStateManager.SocketToPlayerData.keys()];
          let i = 0;
          var test = () => {
            return i < playerIdArray.length;
          };
          var loop = () => {
            let playerObject = gameStateManager.SocketToPlayerData.get(playerIdArray[i++]);
            playerObject.tick(deltaTime, gameStateManager.pendingUpdates, gameStateManager);
            return true;
          };
          nbLoop(test, loop);
        } catch (err) {
          console.log(err);
        }
      },
    
      BattleEndState: ({gameStateManager}) => {

      }
}