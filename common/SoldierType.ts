export type SoldierType = "SPEARMAN" | "KNIGHT";
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
