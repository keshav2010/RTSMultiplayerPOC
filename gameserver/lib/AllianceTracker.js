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
    setAlliance(playerA_Id, playerB_Id, allianceType) {
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
    }
    getAlliance(playerA_Id, playerB_Id) {
        if(playerA_Id === playerB_Id) return AllianceTypes.ALLY;
        if(!this.allianceMap[playerA_Id] || !this.allianceMap[playerA_Id][playerB_Id]) return AllianceTypes.NEUTRAL;
        return this.allianceMap[playerA_Id][playerB_Id];
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