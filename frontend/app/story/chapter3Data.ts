import type { FloorTileType, GridMap, Interactable, PlacedObject, TileType } from "./types";
import {
  makeGrid,
  scatterObjects,
  fillRegion,
  makeOpenAreaTiles,
  blockObjectFootprints,
  buildAreaMap,
} from "./mapGen";

// ============================================================
// 第3章「魔法の森」のエリアマップ（WORLD_DESIGN.md 2.第3章 参照）。
// フェーズ1（マップだけ用意する段階）につき、出口・NPCの会話中身・StoryGame.tsxへの
// 配線はまだ無い（frontend/app/story/MAP_GUIDE.md 4節参照）。
// 妖精の里 → 迷いの森の2枚構成のうち、この2枚をここに用意した
// （古代神殿・フェンリルの間は今回は省略）。
// ============================================================

// ------------------------------------------------------------
// ① 妖精の里（FAIRY_VILLAGE_MAP）
// ------------------------------------------------------------
export const FAIRY_VILLAGE_TILE_SIZE = 48;
const FAIRY_VILLAGE_WIDTH = 26;
const FAIRY_VILLAGE_HEIGHT = 20;

function buildFairyVillageFloor(): FloorTileType[][] {
  const floor = makeGrid<FloorTileType>(FAIRY_VILLAGE_WIDTH, FAIRY_VILLAGE_HEIGHT, "grass");
  fillRegion(floor, { x0: 12, y0: 1, x1: 13, y1: 18 }, "dirt"); // 南の入口から里の中心へ続く道
  fillRegion(floor, { x0: 17, y0: 13, x1: 21, y1: 16 }, "water"); // 里の泉
  return floor;
}

// 妖精サイズの小さな家。人間の村の家（6x6）より一回り小さい3x3にしてある
const FAIRY_HUTS = scatterObjects(
  "fairy-hut",
  "/images/map/okimono/ie.png",
  { widthTiles: 3, heightTiles: 3, collisionHeightTiles: 2, blocksMovement: true },
  [[6, 6], [19, 6], [6, 14]]
);

const FAIRY_FLOWERS = scatterObjects(
  "fairy-flower",
  "/images/map/okimono/hana.png",
  { widthTiles: 2, heightTiles: 2, groundLevel: true },
  [[5, 5], [8, 7], [18, 5], [20, 7], [5, 13], [8, 15]]
);

export const FAIRY_VILLAGE_OBJECTS: PlacedObject[] = [...FAIRY_HUTS, ...FAIRY_FLOWERS];

function buildFairyVillageTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(FAIRY_VILLAGE_WIDTH, FAIRY_VILLAGE_HEIGHT);
  blockObjectFootprints(tiles, FAIRY_VILLAGE_OBJECTS);
  return tiles;
}

export const FAIRY_VILLAGE_FLOOR_TEXTURES: FloorTileType[][] = buildFairyVillageFloor();
export const FAIRY_VILLAGE_MAP: GridMap = buildAreaMap(buildFairyVillageTiles(), { x: 12, y: 17 });

// ============================================================
// 妖精の里の会話（フェーズ2：マップ同士のつながりを実装）
// ============================================================
// 出口（フィールドへ戻る）だけ用意した。魔法の使い方を教わる場面・NPCの中身は
// まだ実装していない（WORLD_DESIGN.md 2.第3章参照。3章本編を作るときに追加する）
export const FAIRY_VILLAGE_INTERACTABLES: Interactable[] = [
  {
    id: "fairy-village-exit",
    x: 12,
    y: 18,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["妖精の里を出て、森の入り口へ戻った。"],
  },
];

// ------------------------------------------------------------
// ② 迷いの森（MAZE_FOREST_MAP）：木の生け垣で作った一本道の迷路
// ------------------------------------------------------------
export const MAZE_FOREST_TILE_SIZE = 48;
const MAZE_FOREST_WIDTH = 34;
const MAZE_FOREST_HEIGHT = 26;

function buildMazeForestFloor(): FloorTileType[][] {
  return makeGrid<FloorTileType>(MAZE_FOREST_WIDTH, MAZE_FOREST_HEIGHT, "grass");
}

// 生け垣（木）の帯を4本、隙間の位置を左右交互にすることで、南の入口から
// 北の奥までジグザグに歩かないと辿り着けない一本道の迷路にしてある
const MAZE_BANDS: { y: number; gapStart: number; gapEnd: number }[] = [
  { y: 6, gapStart: 4, gapEnd: 6 },
  { y: 11, gapStart: 27, gapEnd: 29 },
  { y: 16, gapStart: 4, gapEnd: 6 },
  { y: 21, gapStart: 27, gapEnd: 29 },
];

const MAZE_HEDGE_POSITIONS: [number, number][] = MAZE_BANDS.flatMap(({ y, gapStart, gapEnd }) =>
  Array.from({ length: 30 }, (_, i) => i + 2)
    .filter((x) => x < gapStart || x > gapEnd)
    .map((x): [number, number] => [x, y])
);

const MAZE_HEDGES = scatterObjects(
  "maze-hedge",
  "/images/map/okimono/tree2.png",
  { widthTiles: 1, heightTiles: 1, blocksMovement: true },
  MAZE_HEDGE_POSITIONS
);

export const MAZE_FOREST_OBJECTS: PlacedObject[] = [...MAZE_HEDGES];

function buildMazeForestTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(MAZE_FOREST_WIDTH, MAZE_FOREST_HEIGHT);
  blockObjectFootprints(tiles, MAZE_FOREST_OBJECTS);
  return tiles;
}

export const MAZE_FOREST_FLOOR_TEXTURES: FloorTileType[][] = buildMazeForestFloor();
// 開始位置は南端（最初の生け垣の帯より手前）
export const MAZE_FOREST_MAP: GridMap = buildAreaMap(buildMazeForestTiles(), { x: 16, y: 23 });
