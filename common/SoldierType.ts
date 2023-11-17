export enum SoldierType {
  SPEARMAN = "SPEARMAN",
  KNIGHT = "KNIGHT",
}

export const SoldierTypeConfig: {
  [K in SoldierType]: { cost: number };
} = {
  SPEARMAN: {
    cost: 10,
  },
  KNIGHT: {
    cost: 20,
  },
};
