export type SoldierType = "SPEARMAN" | "KNIGHT";
export const SoldierTypeConfig: {
  [K in SoldierType]: {
    cost: number;
    speed: number;
    damage: number;
    health: number;
  };
} = {
  SPEARMAN: {
    cost: 10,
    speed: 60,
    damage: 20,
    health: 100,
  },
  KNIGHT: {
    cost: 25,
    speed: 45,
    damage: 37,
    health: 110,
  },
};
