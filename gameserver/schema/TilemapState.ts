import { Schema, type, ArraySchema } from "@colyseus/schema";
import { createNoise2D } from "simplex-noise";
import { PlayerState } from "./PlayerState";
import SAT from "sat";

export enum ETileType {
  DIRT = "dirt",
  GRASS = "grass",
  WATER = "water",
}

const TilesType = {
  [ETileType.DIRT]: 16,
  [ETileType.GRASS]: 56,
  [ETileType.WATER]: 154,
};

const TilesTypeById: { [key: number]: ETileType } = {
  16: ETileType.DIRT,
  56: ETileType.GRASS,
  154: ETileType.WATER,
};

export function getTileType(tileValue: number): ETileType {
  return TilesTypeById[tileValue];
}

export class TilemapState extends Schema {
  static TILE_INFLUENCE_DISTANCE: number = 10;

  @type(["number"]) tilemap1D = new ArraySchema<number>();

  @type(["string"]) ownershipTilemap1D = new ArraySchema<string>();
  @type("number") tileheight = 32;
  @type("number") tilewidth = 32;
  @type("number") tilemapHeight = 60;
  @type("number") tilemapWidth = 60;
  @type("boolean") ready = false;
  simplex: any;

  constructor() {
    super();
    this.simplex = createNoise2D();
    this.generateTilemap();
  }

  private get2DIndex(index1D: number): SAT.Vector {
    const row = Math.floor(index1D / this.tilemapWidth);
    const col = index1D % this.tilemapWidth;
    return new SAT.Vector(col, row);
  }

  getTileTypeAt(index: number) {
    const tileId = this.tilemap1D.at(index);
    return TilesTypeById[tileId];
  }

  updateOwnershipMap(players: PlayerState[]) {
    let tilesAffected = 0;

    for (
      let tileIndex1D = 0;
      tileIndex1D < this.ownershipTilemap1D.length;
      tileIndex1D++
    ) {
      const tileType = this.getTileTypeAt(tileIndex1D);
      if (tileType === "water") continue;

      const currentOwner = this.ownershipTilemap1D.at(tileIndex1D);
      const newOwner = this.selectTileOwner(tileIndex1D, players);
      if (newOwner === currentOwner) continue;

      tilesAffected++;
      this.ownershipTilemap1D[tileIndex1D] = newOwner;
    }
  }

  private selectTileOwner(
    tileIndex: number,
    players: PlayerState[]
  ): string | "NONE" {
    let ownerId = "NONE";
    let minDistance = TilemapState.TILE_INFLUENCE_DISTANCE;

    for (const player of players) {
      const castlePosition = player.pos.getVector();

      // Convert to tile coordinates
      castlePosition.x = Math.floor(castlePosition.x / this.tilewidth);
      castlePosition.y = Math.floor(castlePosition.y / this.tileheight);

      const tilePos = this.get2DIndex(tileIndex);

      const distanceFromTile = castlePosition.sub(tilePos).len();
      if (distanceFromTile >= minDistance) continue;

      minDistance = distanceFromTile;
      ownerId = player.id;
    }
    return ownerId;
  }

  async generateTilemap() {
    this.ready = false;
    const { tilemapWidth, tilemapHeight } = this;
    const perlinScale = Math.max(0.03, 0.05 * Math.random()); // Lower scale for larger features
    const noiseMap = Array.from({ length: tilemapHeight }, () =>
      Array(tilemapWidth).fill(0)
    );

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
        } else if (noiseValue < 0.5 * Math.random()) {
          tileTypeIndex = TilesType.dirt;
        } else {
          tileTypeIndex = TilesType.grass;
        }
        this.tilemap1D.push(tileTypeIndex);
        this.ownershipTilemap1D.push("NONE");
      }
    }
    this.ready = true;
  }

  perlin(x: number, y: number): number {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  }
}
