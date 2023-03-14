
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
    getPlayer(id = null){
        return this.ConnectedPlayers.get(id || this.playerId);
    }
    removePlayer(playerId){
        if(this.ConnectedPlayers.has(playerId)){
            console.log(this.ConnectedPlayers.get(playerId));
            this.ConnectedPlayers.get(playerId).getSoldiers().forEach(soldier => {
                this.ConnectedPlayers.get(playerId).removeSoldier(soldier);
            });
            this.ConnectedPlayers.delete(playerId);
        }
    }
    removeSoldier(playerId, soldierId) {
        if(!this.ConnectedPlayers.has(playerId)) {
            console.warn(`Failed to remove soldier ${soldierId}, since player does not exists (playerId: ${playerId}).`);
            return;
        }
        let player = this.ConnectedPlayers.get(playerId);
        let soldierArr = player.getSoldier(soldierId);
        if(soldierArr.length === 0) {
            console.log(`Soldier(${soldierId}) not found for player: ${playerId}`);
            return;
        }
        let soldier = soldierArr[0];
        player.removeSoldier(soldier);
        return;
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