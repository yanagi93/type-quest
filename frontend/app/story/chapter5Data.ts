import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import {
  makeGrid,
  scatterObjects,
  fillRegion,
  makeOpenAreaTiles,
  blockObjectFootprints,
  buildAreaMap,
} from "./mapGen";

// ============================================================
// 第5章「荒れ果てた町」のエリアマップ（WORLD_DESIGN.md 2.第5章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・謎の青年の正体判明イベント・
// StoryGame.tsxへの配線はまだ無い（frontend/app/story/MAP_GUIDE.md 4節参照）。
// 崩壊した町→時計塔→地下施設→英雄の間の4段構成のうち、
// 入口にあたる「崩壊した町」だけ先に1枚用意した。
// ============================================================

export const RUINED_TOWN_TILE_SIZE = 48;
const RUINED_TOWN_WIDTH = 30;
const RUINED_TOWN_HEIGHT = 24;

const TILESET_DIR = "/images/map/okimono/tileset";

function buildRuinedTownFloor(): FloorTileType[][] {
  // ひび割れた土がベース。かつての石畳の広場だけ stone を残してある
  const floor = makeGrid<FloorTileType>(RUINED_TOWN_WIDTH, RUINED_TOWN_HEIGHT, "dirt");
  fillRegion(floor, { x0: 12, y0: 9, x1: 17, y1: 13 }, "stone"); // かつての広場
  fillRegion(floor, { x0: 4, y0: 4, x1: 6, y1: 5 }, "water"); // 壊れた井戸から水があふれている場所
  return floor;
}

// 崩れかけの建物。位置をわざと不揃いにして、廃墟らしい乱雑さを出している
const RUINED_TOWN_BUILDINGS = scatterObjects(
  "ruined-town-building",
  "/images/map/okimono/ie.png",
  { widthTiles: 6, heightTiles: 6, collisionHeightTiles: 3, blocksMovement: true },
  [[5, 10], [23, 7], [21, 17], [8, 18]]
);

// 崩れた壁の破片。踏んでも通れる飾り
const RUINED_TOWN_RUBBLE = scatterObjects(
  "ruined-town-rubble",
  `${TILESET_DIR}/icon_wall_piece.png`,
  { widthTiles: 1, heightTiles: 1, groundLevel: true },
  [[10, 6], [19, 9], [14, 17], [24, 14], [6, 15], [17, 4]]
);

// 時計塔（4章のエリアマップに繋がる予定の目印。今はただの景観）
const RUINED_TOWN_CLOCK_TOWER = scatterObjects(
  "ruined-town-clock-tower",
  `${TILESET_DIR}/icon_tower_a_body.png`,
  { widthTiles: 2, heightTiles: 4, blocksMovement: true },
  [[26, 4]]
);

export const RUINED_TOWN_OBJECTS: PlacedObject[] = [
  ...RUINED_TOWN_BUILDINGS,
  ...RUINED_TOWN_RUBBLE,
  ...RUINED_TOWN_CLOCK_TOWER,
];

function buildRuinedTownTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(RUINED_TOWN_WIDTH, RUINED_TOWN_HEIGHT);
  blockObjectFootprints(tiles, RUINED_TOWN_OBJECTS);
  return tiles;
}

export const RUINED_TOWN_FLOOR_TEXTURES: FloorTileType[][] = buildRuinedTownFloor();
export const RUINED_TOWN_MAP: GridMap = buildAreaMap(buildRuinedTownTiles(), { x: 14, y: 11 });
