import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

const TilesType = {
  dirt: 16,
  grass: 56,
  water: 154,
};
export class TilemapState extends Schema {
  // Key : sessionId
  @type(["number"]) tilemap1D = new ArraySchema<number>();
  @type("number") tileheight = 32;
  @type("number") tilewidth = 32;

  /** height in tiles */
  @type("number") tilemapHeight = 60;

  /** width in tiles */
  @type("number") tilemapWidth = 60;

  constructor() {
    super();
    this.generateTilemap();
  }

  generateTilemap() {
    const { tilemapWidth, tilemapHeight } = this;
    const perlinScale = 1.5;
    this.tilemap1D.clear();
    console.log('generating tilemap');
    const noiseMap: number[][] = [];
    for (let y = 0; y < tilemapHeight; y++) {
      noiseMap[y] = [];
      for (let x = 0; x < tilemapWidth; x++) {
        noiseMap[y][x] = this.perlin(x * perlinScale, y * perlinScale);
      }
    }

    for (let y = 0; y < tilemapHeight; y++) {
      for (let x = 0; x < tilemapWidth; x++) {
        const noiseValue = noiseMap[y][x];
        let tileTypeIndex = TilesType.dirt;

        if (noiseValue < 0.05*Math.random()) {
          tileTypeIndex = TilesType.water;
        } else if (noiseValue < Math.random()) {
          tileTypeIndex = TilesType.dirt;
        } else {
          tileTypeIndex = TilesType.grass;
        }
        this.tilemap1D.push(tileTypeIndex);
      }
    }
  }

  perlin(x: number, y: number): number {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  }
}
