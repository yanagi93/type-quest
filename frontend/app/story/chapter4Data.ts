import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import {
  makeGrid,
  scatterObjects,
  scatterVariedTexture,
  makeAllWallTiles,
  carveRoom,
  carveCorridor,
  blockObjectFootprints,
  buildAreaMap,
} from "./mapGen";

// ============================================================
// 第4章「謎の洞窟」のエリアマップ（WORLD_DESIGN.md 2.第4章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・魔法ギミック・NPCの中身、
// StoryGame.tsxへの配線はまだ無い（frontend/app/story/MAP_GUIDE.md 4節参照）。
// 入口→分岐→地下湖→古代遺跡→ドラゴンの5段構成のうち、洞窟の骨格（部屋＋通路）だけ
// 1枚のマップとして先に用意した。地下湖・古代遺跡は魔法ギミックの設計と合わせて
// 別枚に分ける可能性があるので、今回はここでは分けていない。
// ============================================================

export const CAVE_TILE_SIZE = 48;
const CAVE_WIDTH = 30;
const CAVE_HEIGHT = 24;

const TILESET_DIR = "/images/map/okimono/tileset";

const CAVE_TREASURE = scatterObjects(
  "cave-treasure",
  "/images/map/okimono/takarabako.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  [[23, 11]]
);

const CAVE_WALL_ACCENTS = scatterVariedTexture(
  "cave-wall-accent",
  TILESET_DIR,
  "texture_mountain",
  9,
  [[8, 11], [15, 13], [21, 10], [24, 12], [7, 3], [14, 4]],
  { groundLevel: true }
);

export const CAVE_OBJECTS: PlacedObject[] = [...CAVE_TREASURE, ...CAVE_WALL_ACCENTS];

function buildCaveTiles(): TileType[][] {
  const tiles = makeAllWallTiles(CAVE_WIDTH, CAVE_HEIGHT);
  carveRoom(tiles, { x0: 12, y0: 18, x1: 17, y1: 21 }); // 入口
  carveCorridor(tiles, [14, 18], [14, 14]);
  carveRoom(tiles, { x0: 8, y0: 10, x1: 16, y1: 14 }); // 最初の広間（分岐）
  carveCorridor(tiles, [16, 12], [22, 12]); // 東の枝道
  carveRoom(tiles, { x0: 20, y0: 9, x1: 25, y1: 13 }); // 東の洞（宝あり）
  carveCorridor(tiles, [10, 10], [10, 5]); // 北へ続く道
  carveRoom(tiles, { x0: 6, y0: 2, x1: 15, y1: 5 }); // 最奥（ボス部屋になる予定）
  blockObjectFootprints(tiles, CAVE_TREASURE);
  return tiles;
}

export const CAVE_FLOOR_TEXTURES: FloorTileType[][] = makeGrid(CAVE_WIDTH, CAVE_HEIGHT, "stone");
export const CAVE_MAP: GridMap = buildAreaMap(buildCaveTiles(), { x: 14, y: 20 });
