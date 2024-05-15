import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { createNoise2D } from 'simplex-noise';

const TilesType = {
  dirt: 16,
  grass: 56,
  water: 154,
};
const TilesTypeById: { [key: number]: string } = {
  16: "dirt",
  56: "grass",
  154: "water",
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

  @type("boolean") ready = false;
  simplex: any;

  constructor() {
    super();
    this.simplex = createNoise2D();

    this.generateTilemap();
  }

  getTileTypeAt(x: number, y: number) {
    const col = Math.floor(x/this.tilewidth);
    const row = Math.floor(y/this.tileheight);
    const index1D = col + row * this.tilemapWidth;
    const tileId =  this.tilemap1D.at(index1D);
    return TilesTypeById[tileId];
  }

  async generateTilemap() {
    this.ready = false;
    const { tilemapWidth, tilemapHeight } = this;
    const perlinScale = Math.max(0.03,0.05*Math.random()); // Lower scale for larger features
    const noiseMap = Array.from({ length: tilemapHeight }, () => Array(tilemapWidth).fill(0));

    for (let y = 0; y < tilemapHeight; y++) {
      for (let x = 0; x < tilemapWidth; x++) {
        noiseMap[y][x] = this.simplex(x * perlinScale, y * perlinScale);
      }
    }

    for (let y = 0; y < tilemapHeight; y++) {
      for (let x = 0; x < tilemapWidth; x++) {
        const noiseValue = noiseMap[y][x];
        let tileTypeIndex = TilesType.dirt;
        if (noiseValue < -0.5) {
          tileTypeIndex = TilesType.water;
        } else if (noiseValue < -0.1 && Math.random() < 0.05) {
          tileTypeIndex = TilesType.water;
        } else if (noiseValue < 0.5*Math.random()) {
          tileTypeIndex = TilesType.dirt;
        } else {
          tileTypeIndex = TilesType.grass;
        }
        this.tilemap1D.push(tileTypeIndex);
      }
    }
    this.ready = true;
  }

  perlin(x: number, y: number): number {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  }
}
