import { PlayerState } from "../../gameserver/schema/PlayerState";
import { SessionState } from "../../gameserver/schema/SessionState";

function getPlayer(state: SessionState, id: string) {
  return state.players.get(id);
}

function getPlayers(state: SessionState) {
  return [...state.players.values()];
}

function getSoldier(
  state: SessionState,
  playerState: PlayerState,
  soldierId: string
) {
  return playerState.soldiers.get(soldierId);
}

function getSoldiers(state: SessionState, playerId: string) {
  const player = getPlayer(state, playerId);
  if (!player) {
    console.log("player not found");
    return undefined;
  }
  return [...player.soldiers.values()];
}

export default {
  getPlayer,
  getPlayers,
  getSoldier,
  getSoldiers,
};
