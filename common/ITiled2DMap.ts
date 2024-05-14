export interface ITiled2DMap {
    layers: {
      data: number[];
      height: number;
      width: number;
      name: string;
      type: string;
    }[];
    height: number;
    width: number;
  }