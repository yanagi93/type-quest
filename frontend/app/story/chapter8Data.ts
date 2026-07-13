import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import {
  makeGrid,
  scatterObjects,
  fillRegion,
  makeAllWallTiles,
  carveRoom,
  carveCorridor,
  buildAreaMap,
} from "./mapGen";

// ============================================================
// 第8章「魔王討伐（魔王大陸）」のエリアマップ（WORLD_DESIGN.md 2.第8章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・魔族の町の会話イベント・
// 光魔法の習得イベント・StoryGame.tsxへの配線はまだ無い
// （frontend/app/story/MAP_GUIDE.md 4節参照）。
// 荒野→魔族の町→闇の神殿→魔王城→ラスボスの5段構成のうち、
// 最後の「魔王城」だけ先に1枚用意した（内部は玉座の間へ一直線＋東西の脇部屋という、
// 集大成の章にふさわしい左右対称のレイアウトにしてある）。
// ============================================================

export const DEMON_CASTLE_TILE_SIZE = 48;
const DEMON_CASTLE_WIDTH = 34;
const DEMON_CASTLE_HEIGHT = 28;

const TILESET_DIR = "/images/map/okimono/tileset";

function buildDemonCastleFloor(): FloorTileType[][] {
  const floor = makeGrid<FloorTileType>(DEMON_CASTLE_WIDTH, DEMON_CASTLE_HEIGHT, "dirt");
  fillRegion(floor, { x0: 8, y0: 11, x1: 25, y1: 17 }, "stone"); // 大広間
  fillRegion(floor, { x0: 8, y0: 1, x1: 25, y1: 4 }, "stone"); // 玉座の間
  return floor;
}

// 城門の両脇の塔。見た目だけの飾り
const DEMON_CASTLE_TOWERS = scatterObjects(
  "demon-castle-tower",
  `${TILESET_DIR}/icon_tower_b_body.png`,
  { widthTiles: 2, heightTiles: 4, groundLevel: true },
  [[11, 25], [22, 25]]
);

// 大広間に散らばる瓦礫。見た目だけの飾り
const DEMON_CASTLE_RUBBLE = scatterObjects(
  "demon-castle-rubble",
  `${TILESET_DIR}/icon_wall_piece.png`,
  { widthTiles: 1, heightTiles: 1, groundLevel: true },
  [[10, 13], [23, 15], [16, 12], [19, 16]]
);

export const DEMON_CASTLE_OBJECTS: PlacedObject[] = [...DEMON_CASTLE_TOWERS, ...DEMON_CASTLE_RUBBLE];

function buildDemonCastleTiles(): TileType[][] {
  const tiles = makeAllWallTiles(DEMON_CASTLE_WIDTH, DEMON_CASTLE_HEIGHT);
  carveRoom(tiles, { x0: 13, y0: 22, x1: 20, y1: 25 }); // 入口広間
  carveCorridor(tiles, [16, 22], [16, 17]);
  carveRoom(tiles, { x0: 8, y0: 11, x1: 25, y1: 17 }); // 大広間
  carveCorridor(tiles, [8, 13], [3, 13]);
  carveRoom(tiles, { x0: 2, y0: 9, x1: 7, y1: 15 }); // 西の脇部屋
  carveCorridor(tiles, [25, 13], [30, 13]);
  carveRoom(tiles, { x0: 28, y0: 9, x1: 31, y1: 15 }); // 東の脇部屋
  carveCorridor(tiles, [16, 11], [16, 4]);
  carveRoom(tiles, { x0: 8, y0: 1, x1: 25, y1: 4 }); // 玉座の間（ラスボス戦になる予定）
  return tiles;
}

export const DEMON_CASTLE_FLOOR_TEXTURES: FloorTileType[][] = buildDemonCastleFloor();
export const DEMON_CASTLE_MAP: GridMap = buildAreaMap(buildDemonCastleTiles(), { x: 16, y: 24 });
