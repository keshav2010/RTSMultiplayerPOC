const AllianceTypes = {
    NEUTRAL: "N",
    ENEMIES: "E",
    ALLY: "A",
}
class AllianceTracker {
    constructor()
    {
        this.allianceMap = {};
    }
    setAlliance(playerA_Id, playerB_Id, allianceType, stateManager) {
        if(!Object.values(AllianceTypes).includes(allianceType))
            throw new Error("AllianceType is invalid.");
        if(!playerA_Id || !playerB_Id)
            return;
        if(!this.allianceMap[playerA_Id])
            this.allianceMap[playerA_Id] = {};
        if(!this.allianceMap[playerB_Id])
            this.allianceMap[playerB_Id] = {};
        this.allianceMap[playerA_Id][playerB_Id] = allianceType;
        this.allianceMap[playerB_Id][playerA_Id] = allianceType;

        console.log(this.allianceMap);
    }
    getAlliance(playerA_Id, playerB_Id, stateManager) {
        if(playerA_Id && playerB_Id && playerA_Id === playerB_Id) {
            this.allianceMap[playerA_Id][playerB_Id] = AllianceTypes.ALLY;
            return AllianceTypes.ALLY;
        }
        return this.allianceMap[playerA_Id][playerB_Id] || AllianceTypes.NEUTRAL;
    }
    removeEntry(playerId) {
        Object.keys(this.allianceMap).forEach(player => {
            if(this.allianceMap[player][playerId])
                delete this.allianceMap[player][playerId];
        });
        if(this.allianceMap[playerId]) {
            delete this.allianceMap[playerId];
        }
    }
}
module.exports = {AllianceTypes, AllianceTracker}