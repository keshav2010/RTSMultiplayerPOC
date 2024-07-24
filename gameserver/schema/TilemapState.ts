import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
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

  getTileTypeAt(index: number) : ETileType {
    const tileId = this.tilemap1D.at(index);
    return TilesTypeById[tileId];
  }

  updateOwnershipMap(players: MapSchema<PlayerState, string>) {
    for (
      let tileIndex1D = 0;
      tileIndex1D < this.ownershipTilemap1D.length;
      tileIndex1D++
    ) {
      const tileType = this.getTileTypeAt(tileIndex1D);
      if (tileType === ETileType.WATER) continue;

      this.ownershipTilemap1D[tileIndex1D] = this.getTileOwner(
        tileIndex1D,
        players
      );
    }
  }

  private isTileWithinPlayerReach(
    player: PlayerState | undefined,
    tile1DIndex: number
  ): boolean {
    if (!player) return false;
    const minDistance = TilemapState.TILE_INFLUENCE_DISTANCE;
    let isValidOwner = false;
    const castleAndCaptureFlagPos = player.captureFlags.map((flag) =>
      flag.pos.getVector()
    );
    castleAndCaptureFlagPos.push(player.pos.getVector());

    const tilePos = this.get2DIndex(tile1DIndex);
    for (const pos of castleAndCaptureFlagPos) {
      pos.x = Math.floor(pos.x / this.tilewidth);
      pos.y = Math.floor(pos.y / this.tileheight);
      const distanceFromTile = pos.sub(tilePos).len();
      if (distanceFromTile >= minDistance) continue;
      isValidOwner = true;
      break;
    }

    return isValidOwner;
  }
  private getTileOwner(
    tile1DIndex: number,
    players: MapSchema<PlayerState, string>
  ): string | "NONE" {
    const currentOwner = this.ownershipTilemap1D.at(tile1DIndex);
    let ownerId = players.has(currentOwner) ? currentOwner : "NONE";
    let isTileWithinCurrentOwnerReach = this.isTileWithinPlayerReach(
      players.get(ownerId),
      tile1DIndex
    );

    // if tile currently has an active owner that satisfies the ownership creteria
    if (isTileWithinCurrentOwnerReach) return ownerId;

    ownerId = 'NONE';
    let minDistance = TilemapState.TILE_INFLUENCE_DISTANCE;

    let hasOwner: boolean = false;
    for (const [_, player] of players) {
      const castleAndCaptureFlagPos = player.captureFlags.map((flag) =>
        flag.pos.getVector()
      );
      castleAndCaptureFlagPos.push(player.pos.getVector());

      const tilePos = this.get2DIndex(tile1DIndex);
      for (const pos of castleAndCaptureFlagPos) {
        pos.x = Math.floor(pos.x / this.tilewidth);
        pos.y = Math.floor(pos.y / this.tileheight);
        const distanceFromTile = pos.sub(tilePos).len();
        if (distanceFromTile >= minDistance) continue;
        hasOwner = true;
        minDistance = distanceFromTile;
        ownerId = player.id;
      }
    }
    return hasOwner ? ownerId : "NONE";
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
