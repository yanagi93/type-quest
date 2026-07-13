import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";
import {
  makeGrid,
  scatterObjects,
  scatterVariedTexture,
  fillRegion,
  makeOpenAreaTiles,
  makeAllWallTiles,
  carveRoom,
  carveCorridor,
  blockObjectFootprints,
  buildAreaMap,
} from "./mapGen";

// ============================================================
// 第2章「砂漠の町」のエリアマップ（WORLD_DESIGN.md 2.第2章 参照）。
// 今はマップ（床・当たり判定・見た目の置物）だけを用意する段階で、出口や会話・NPCの
// 中身、StoryGame.tsxへの配線はまだ無い（あとでフェーズ2としてまとめてつなげる。
// frontend/app/story/MAP_GUIDE.md 4節参照）。
// 町 → 砂漠 → ピラミッドの3枚構成のうち、この3枚をここに用意した
// （オアシス・オークキングの間は今回は省略。必要になったら追加する）。
// ============================================================

const TILESET_DIR = "/images/map/okimono/tileset";

// ------------------------------------------------------------
// ① 砂漠の町（DESERT_TOWN_MAP）
// ------------------------------------------------------------
export const DESERT_TOWN_TILE_SIZE = 48;
const DESERT_TOWN_WIDTH = 32;
const DESERT_TOWN_HEIGHT = 24;

function buildDesertTownFloor(): FloorTileType[][] {
  const floor = makeGrid<FloorTileType>(DESERT_TOWN_WIDTH, DESERT_TOWN_HEIGHT, "sand");
  fillRegion(floor, { x0: 15, y0: 1, x1: 16, y1: 22 }, "dirt"); // 縦の大通り
  fillRegion(floor, { x0: 1, y0: 11, x1: 30, y1: 12 }, "dirt"); // 横の大通り
  fillRegion(floor, { x0: 13, y0: 9, x1: 18, y1: 14 }, "stone"); // 中央広場
  return floor;
}

// 建物はまだ空き家の置物として置くだけ（宿屋・武器屋・防具屋として実際に機能させるのは
// ショップ実装の時。3章の家と同じく、後で会話・入店処理を足せるようInteractableに
// 差し替える想定）
const DESERT_TOWN_BUILDINGS = scatterObjects(
  "desert-town-building",
  "/images/map/okimono/ie.png",
  { widthTiles: 6, heightTiles: 6, collisionHeightTiles: 3, blocksMovement: true },
  [
    [6, 6], // 宿屋になる予定
    [25, 6], // 武器屋になる予定
    [6, 18], // 防具屋になる予定
  ]
);

const DESERT_TOWN_TOWER = scatterObjects(
  "desert-town-tower",
  `${TILESET_DIR}/icon_tower_a_body.png`,
  { widthTiles: 2, heightTiles: 4, blocksMovement: true },
  [[4, 3]]
);

const DESERT_TOWN_ROCKS = scatterObjects(
  "desert-town-rock",
  "/images/map/okimono/isi.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  [[3, 3], [3, 20], [28, 3], [28, 20], [10, 3], [21, 20]]
);

// 市場の露店。見た目だけの飾り（踏んでも通れる）
const DESERT_TOWN_TENTS = scatterObjects(
  "desert-town-tent",
  `${TILESET_DIR}/icon_tent.png`,
  { widthTiles: 2, heightTiles: 2, groundLevel: true },
  [[11, 9], [19, 9]]
);

export const DESERT_TOWN_OBJECTS: PlacedObject[] = [
  ...DESERT_TOWN_BUILDINGS,
  ...DESERT_TOWN_TOWER,
  ...DESERT_TOWN_ROCKS,
  ...DESERT_TOWN_TENTS,
];

function buildDesertTownTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(DESERT_TOWN_WIDTH, DESERT_TOWN_HEIGHT);
  blockObjectFootprints(tiles, DESERT_TOWN_OBJECTS);
  return tiles;
}

export const DESERT_TOWN_FLOOR_TEXTURES: FloorTileType[][] = buildDesertTownFloor();
// 開始位置は縦の大通りの南寄り（将来ここに町の入口を置く想定）
export const DESERT_TOWN_MAP: GridMap = buildAreaMap(buildDesertTownTiles(), { x: 16, y: 20 });

// ------------------------------------------------------------
// ② 砂漠（DESERT_DUNES_MAP）：町とピラミッドの間の道中
// ------------------------------------------------------------
export const DESERT_DUNES_TILE_SIZE = 64;
const DESERT_DUNES_WIDTH = 40;
const DESERT_DUNES_HEIGHT = 22;

function buildDesertDunesFloor(): FloorTileType[][] {
  const floor = makeGrid<FloorTileType>(DESERT_DUNES_WIDTH, DESERT_DUNES_HEIGHT, "sand");
  fillRegion(floor, { x0: 19, y0: 1, x1: 20, y1: 20 }, "dirt"); // 縦断する道
  fillRegion(floor, { x0: 14, y0: 9, x1: 22, y1: 13 }, "water"); // オアシスの水場
  return floor;
}

const DESERT_DUNES_LEFT = scatterVariedTexture(
  "dune-left",
  TILESET_DIR,
  "texture_sand_dune",
  9,
  [
    [2, 2], [5, 4], [9, 3], [3, 7], [7, 8], [11, 7],
    [2, 12], [6, 13], [10, 14], [3, 17], [7, 18], [11, 19],
  ],
  { blocksMovement: true }
);

const DESERT_DUNES_RIGHT = scatterVariedTexture(
  "dune-right",
  TILESET_DIR,
  "texture_sand_dune",
  9,
  [
    [29, 2], [33, 3], [37, 4], [27, 7], [31, 8], [35, 7],
    [28, 12], [32, 13], [36, 14], [29, 17], [33, 18], [37, 19],
  ],
  { blocksMovement: true }
);

// オアシスの木。水場の東西に1本ずつ、道を塞がないように配置
const DESERT_DUNES_PALMS = scatterObjects(
  "oasis-palm",
  "/images/map/okimono/tree2.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  [[13, 11], [23, 11]]
);

export const DESERT_DUNES_OBJECTS: PlacedObject[] = [
  ...DESERT_DUNES_LEFT,
  ...DESERT_DUNES_RIGHT,
  ...DESERT_DUNES_PALMS,
];

function buildDesertDunesTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(DESERT_DUNES_WIDTH, DESERT_DUNES_HEIGHT);
  blockObjectFootprints(tiles, DESERT_DUNES_OBJECTS);
  return tiles;
}

export const DESERT_DUNES_FLOOR_TEXTURES: FloorTileType[][] = buildDesertDunesFloor();
// 開始位置は道の南端（町側）。北端（y=1付近）がピラミッド側の想定
export const DESERT_DUNES_MAP: GridMap = buildAreaMap(buildDesertDunesTiles(), { x: 20, y: 20 });

// ------------------------------------------------------------
// ③ ピラミッド（PYRAMID_MAP）：ミニダンジョン
// ------------------------------------------------------------
export const PYRAMID_TILE_SIZE = 48;
const PYRAMID_WIDTH = 26;
const PYRAMID_HEIGHT = 20;

const PYRAMID_TREASURE = scatterObjects(
  "pyramid-treasure",
  "/images/map/okimono/takarabako.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  [[21, 7]]
);

const PYRAMID_ENTRANCE_DECOR = scatterObjects(
  "pyramid-entrance-decor",
  `${TILESET_DIR}/icon_pyramid.png`,
  { widthTiles: 1, heightTiles: 1, groundLevel: true },
  [[10, 16]]
);

const PYRAMID_WALL_ACCENTS = scatterVariedTexture(
  "pyramid-wall-accent",
  TILESET_DIR,
  "texture_mountain",
  9,
  [[9, 8], [16, 9], [8, 2], [17, 3]],
  { groundLevel: true }
);

export const PYRAMID_OBJECTS: PlacedObject[] = [
  ...PYRAMID_TREASURE,
  ...PYRAMID_ENTRANCE_DECOR,
  ...PYRAMID_WALL_ACCENTS,
];

function buildPyramidTiles(): TileType[][] {
  const tiles = makeAllWallTiles(PYRAMID_WIDTH, PYRAMID_HEIGHT);
  carveRoom(tiles, { x0: 10, y0: 14, x1: 15, y1: 17 }); // 入口の間
  carveCorridor(tiles, [12, 14], [12, 10]);
  carveRoom(tiles, { x0: 9, y0: 7, x1: 16, y1: 10 }); // 中央の間
  carveCorridor(tiles, [16, 8], [21, 8]);
  carveRoom(tiles, { x0: 19, y0: 6, x1: 23, y1: 9 }); // 東の宝物庫（行き止まり）
  carveCorridor(tiles, [12, 7], [12, 3]);
  carveRoom(tiles, { x0: 8, y0: 1, x1: 17, y1: 4 }); // 最奥の間（ボス部屋になる予定）
  blockObjectFootprints(tiles, PYRAMID_TREASURE);
  return tiles;
}

export const PYRAMID_FLOOR_TEXTURES: FloorTileType[][] = makeGrid(PYRAMID_WIDTH, PYRAMID_HEIGHT, "stone");
export const PYRAMID_MAP: GridMap = buildAreaMap(buildPyramidTiles(), { x: 12, y: 15 });
