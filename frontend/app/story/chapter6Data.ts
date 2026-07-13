import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import { makeGrid, scatterObjects, fillRegion, makeOpenAreaTiles, blockObjectFootprints, buildAreaMap } from "./mapGen";

// ============================================================
// 第6章「毒の沼地」のエリアマップ（WORLD_DESIGN.md 2.第6章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・毒の地形ダメージ処理・
// StoryGame.tsxへの配線はまだ無い（frontend/app/story/MAP_GUIDE.md 4節参照）。
// 沼入口→毒沼→廃神殿→地下沼→クラーケンの5段構成のうち、
// 「毒沼」本体にあたる沼地の地形だけ先に1枚用意した。
// 水たまり（"water"の見た目）の上に実際に乗るとダメージ、という地形ハザードは
// 後で実装する想定（今はまだ見た目だけで、乗ってもダメージは無い）。
// ============================================================

export const SWAMP_TILE_SIZE = 48;
const SWAMP_WIDTH = 30;
const SWAMP_HEIGHT = 22;

function buildSwampFloor(): FloorTileType[][] {
  const floor = makeGrid<FloorTileType>(SWAMP_WIDTH, SWAMP_HEIGHT, "dirt");
  // 4つの水たまりを角に配置し、中央に十字型の乾いた道を残してある
  fillRegion(floor, { x0: 2, y0: 2, x1: 9, y1: 7 }, "water");
  fillRegion(floor, { x0: 19, y0: 3, x1: 27, y1: 8 }, "water");
  fillRegion(floor, { x0: 4, y0: 13, x1: 11, y1: 19 }, "water");
  fillRegion(floor, { x0: 18, y0: 12, x1: 26, y1: 18 }, "water");
  return floor;
}

// 枯れ木・岩。沼のほとりに点在させ、乾いた道を塞がない位置にしてある
const SWAMP_HAZARDS = scatterObjects(
  "swamp-deadwood",
  "/images/map/okimono/tree2.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  [[13, 3], [16, 20], [3, 10], [27, 10]]
);

export const SWAMP_OBJECTS: PlacedObject[] = [...SWAMP_HAZARDS];

function buildSwampTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(SWAMP_WIDTH, SWAMP_HEIGHT);
  blockObjectFootprints(tiles, SWAMP_OBJECTS);
  return tiles;
}

export const SWAMP_FLOOR_TEXTURES: FloorTileType[][] = buildSwampFloor();
// 開始位置は中央の乾いた十字路
export const SWAMP_MAP: GridMap = buildAreaMap(buildSwampTiles(), { x: 14, y: 10 });
