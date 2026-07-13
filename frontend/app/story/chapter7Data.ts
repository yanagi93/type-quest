import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import { makeGrid, scatterObjects, makeAllWallTiles, carveRoom, carveCorridor, buildAreaMap } from "./mapGen";

// ============================================================
// 第7章「なぞをとけ（沈黙の塔）」のエリアマップ（WORLD_DESIGN.md 2.第7章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・階ごとの魔法ギミック（氷を溶かす／
// 橋を動かす等）・StoryGame.tsxへの配線はまだ無い（frontend/app/story/MAP_GUIDE.md
// 4節参照）。1F〜最上階のフロア制ダンジョンのうち、まず1Fの骨格だけ用意した
// （2F以降は同じ要領で追加していく想定）。
// ============================================================

export const SILENT_TOWER_TILE_SIZE = 48;
const SILENT_TOWER_WIDTH = 22;
const SILENT_TOWER_HEIGHT = 22;

const TILESET_DIR = "/images/map/okimono/tileset";

// 塔の中心を貫く柱（見た目だけ。壁マスの上に置いても当たり判定には影響しない）
const SILENT_TOWER_PILLAR = scatterObjects(
  "silent-tower-pillar",
  `${TILESET_DIR}/icon_tower_shared_top.png`,
  { widthTiles: 1, heightTiles: 1, groundLevel: true },
  [[11, 11]]
);

export const SILENT_TOWER_OBJECTS: PlacedObject[] = [...SILENT_TOWER_PILLAR];

function buildSilentTowerTiles(): TileType[][] {
  const tiles = makeAllWallTiles(SILENT_TOWER_WIDTH, SILENT_TOWER_HEIGHT);
  carveRoom(tiles, { x0: 8, y0: 17, x1: 13, y1: 19 }); // 入口
  carveCorridor(tiles, [10, 17], [10, 13]);
  carveRoom(tiles, { x0: 3, y0: 9, x1: 10, y1: 13 }); // 西の間
  carveCorridor(tiles, [5, 9], [5, 5]);
  carveRoom(tiles, { x0: 3, y0: 2, x1: 13, y1: 5 }); // 北の間
  carveCorridor(tiles, [13, 4], [18, 4]);
  carveRoom(tiles, { x0: 16, y0: 2, x1: 19, y1: 6 }); // 東の間（2Fへの階段になる予定）
  return tiles;
}

export const SILENT_TOWER_FLOOR_TEXTURES: FloorTileType[][] = makeGrid(
  SILENT_TOWER_WIDTH,
  SILENT_TOWER_HEIGHT,
  "stone"
);
export const SILENT_TOWER_MAP: GridMap = buildAreaMap(buildSilentTowerTiles(), { x: 10, y: 18 });
