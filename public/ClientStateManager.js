
class ClientStateManager
{
    constructor()
    {
        this.selectedSoldiers = new Map();
        this.ConnectedPlayers = new Map();
        this.playerId;
    }
    getAllPlayers(){
        let players = [...this.ConnectedPlayers.values()]
        return players;
    }
    getOpponentSoldiers(){
        let soldiers = this.getAllPlayers().map(player=>{
            if(player.playerId !== this.playerId)
                return player.getSoldiers()
            return [];
        });
        return soldiers.flat();
    }
    addPlayer(player){
        if(!this.ConnectedPlayers.has(player.playerId))
            this.ConnectedPlayers.set(player.playerId, player);
    }
    getPlayer(id){
        return this.ConnectedPlayers.get(id || this.playerId);
    }
    removePlayer(playerId){
        if(this.ConnectedPlayers.has(playerId)){
            //destroy group and all units
            this.ConnectedPlayers.get(playerId).destroy(true);
            this.ConnectedPlayers.delete(playerId);
        }
    }
    updateSoldierFromServerSnapshot(serverSoldierSnapshot){
        let clientLocalSoldier = this.getPlayer(serverSoldierSnapshot.playerId).getSoldier(serverSoldierSnapshot.id);
        if(clientLocalSoldier.length < 1)
            return;
        clientLocalSoldier = clientLocalSoldier[0];
        clientLocalSoldier.setHealth(serverSoldierSnapshot.health);
    }
    update(time, delta)
    {
        //update each player
        this.ConnectedPlayers.forEach((player, playerId)=>{
            player.update(time, delta);
        });

    }
    clearState(){
        this.selectedSoldiers.clear();
        this.ConnectedPlayers.forEach(function(player){
            player.getSoldiers().forEach(function(soldier){
                player.removeSoldier(soldier);
            });
        })
        this.ConnectedPlayers.clear();
        this.playerId=null;
    }
}
module.exports = ClientStateManager;