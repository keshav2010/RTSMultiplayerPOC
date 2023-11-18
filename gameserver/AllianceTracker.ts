export enum AllianceTypes {
  NEUTRAL = "N",
  ENEMIES = "E",
  ALLY = "A",
}

export class AllianceTracker {
  allianceMap: {
    [key: string]: {
      [key: string]: AllianceTypes;
    };
  };
  constructor() {
    this.allianceMap = {};
  }
  setAlliance(
    playerA_Id: string,
    playerB_Id: string,
    allianceType: AllianceTypes
  ) {
    if (!Object.values(AllianceTypes).includes(allianceType))
      throw new Error("AllianceType is invalid.");
    if (!playerA_Id || !playerB_Id) return;
    if (!this.allianceMap[playerA_Id]) this.allianceMap[playerA_Id] = {};
    if (!this.allianceMap[playerB_Id]) this.allianceMap[playerB_Id] = {};
    this.allianceMap[playerA_Id][playerB_Id] = allianceType;
    this.allianceMap[playerB_Id][playerA_Id] = allianceType;
  }
  getAlliance(playerA_Id: string, playerB_Id: string) {
    if (playerA_Id === playerB_Id) return AllianceTypes.ALLY;
    if (
      !this.allianceMap[playerA_Id] ||
      !this.allianceMap[playerA_Id][playerB_Id]
    )
      return AllianceTypes.NEUTRAL;
    return this.allianceMap[playerA_Id][playerB_Id];
  }
  removeEntry(playerId: string) {
    Object.keys(this.allianceMap).forEach((player) => {
      if (this.allianceMap[player][playerId])
        delete this.allianceMap[player][playerId];
    });
    if (this.allianceMap[playerId]) {
      delete this.allianceMap[playerId];
    }
  }
}
