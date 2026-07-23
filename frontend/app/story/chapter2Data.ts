import type { FloorTileType, GridMap, Interactable, PlacedObject, TileType } from "./types";
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
// 町（お金・宿屋・武器屋・防具屋が実際に機能する）はStoryGame.tsxまで配線済み。
// 砂漠（DESERT_DUNES_MAP）・ピラミッド（PYRAMID_MAP）はまだマップ（床・当たり判定・
// 見た目の置物）だけを用意した段階で、出口や会話・NPCの中身、StoryGame.tsxへの
// 配線はまだ無い（frontend/app/story/MAP_GUIDE.md 4節参照）。
// 町 → 砂漠 → ピラミッドの3枚構成のうち、この3枚をここに用意した
// （オアシス・オークキングの間は今回は省略。必要になったら追加する）。
// ============================================================

const TILESET_DIR = "/images/map/okimono/tileset";

// ============================================================
// お金・装備（第2章の新要素。WORLD_DESIGN.md「第2章：砂漠の町」参照）
// ============================================================
// 買い替え式の装備。tier（state.weaponTier/armorTier、1始まり）を1つ買うと、
// 前の段階の効果は引き継がず今の段階の効果だけになる（宝箱のattackBooks/
// defenseBooksのような「集めるほど積み上がる」ボーナスとは別枠の、常時ONの永続効果）。
// 「言葉を強化する武器」というこのゲームらしさを出すため、武器は打った言葉の威力
// （attackMultiplier）を、防具は受けるダメージ（defenseMultiplier）を直接強化する
export type EquipmentTier = {
  name: string;
  cost: number;
  bonus: number;
  description: string;
  // trueの防具を装備中は、戦闘中ずっと敵の言葉がゆっくり流れる（battle/page.tsxの
  // isSlowed・difficulty.tsのARMOR_SLOW_SPEED_MULTIPLIER参照）。今は鉄の鎧だけの特典
  slowsWords?: boolean;
};

export const WEAPON_TIERS: EquipmentTier[] = [
  { name: "みじかい剣", cost: 30, bonus: 0.15, description: "打った言葉の威力が少し上がる。" },
  { name: "こだまの剣", cost: 90, bonus: 0.3, description: "打った言葉の威力がぐっと上がる。" },
  { name: "言霊の剣", cost: 220, bonus: 0.5, description: "言葉そのものに強い力が宿る、伝説の剣。" },
];

// 「防御力をメインにしてほしい」という要望を受け、防具は武器と同じ値段でも
// 効果を高めに設定してある（同じ段階でweaponより防御ボーナスが大きい）
export const ARMOR_TIERS: EquipmentTier[] = [
  { name: "布の鎧", cost: 30, bonus: 0.2, description: "受けるダメージが少し減る。" },
  { name: "革の鎧", cost: 90, bonus: 0.4, description: "受けるダメージがしっかり減る。" },
  {
    name: "鉄の鎧",
    cost: 220,
    bonus: 0.65,
    description: "重く頑丈な、一人前の冒険者の証。戦闘中ずっと、敵の言葉が少しゆっくり流れるようになる。",
    slowsWords: true,
  },
];

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

// 宿屋・武器屋・防具屋。chapter1Data.tsの村の家（house-fire等）と同じ作り方で、
// kind:"npc"のInteractableとして画像・当たり判定・ドアの位置（interactionX/Y）を
// 持たせている。当たり判定は建物の下3マス分（collisionHeightTiles:3）だけ壁にし、
// その1マス南（建物の外＝通り側）をドアの位置にしてある（footprintOf参照。
// 建物の中に壁の隙間を作る村と違い、砂漠の町のマスは全部
// blockObjectFootprintsで自動生成しているため、ドアは建物の外に置く必要がある）
export const DESERT_TOWN_SHOPS: Interactable[] = [
  {
    id: "desert-town-inn",
    x: 6,
    y: 6,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 6,
    interactionY: 7,
    shopType: "inn",
    dialogue: [
      "小さな宿屋。女将さんが笑顔で迎えてくれた。",
      "女将「疲れてるでしょう、うちに泊まっていきなさいな。」",
    ],
  },
  {
    id: "desert-town-weapon-shop",
    x: 25,
    y: 6,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 25,
    interactionY: 7,
    shopType: "weapon",
    dialogue: [
      "武器屋。壁一面に、いろいろな剣が並んでいる。",
      "店主「言霊の力を宿した剣だ。打った言葉の威力がぐんと上がるぞ。」",
    ],
  },
  {
    id: "desert-town-armor-shop",
    x: 6,
    y: 18,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 6,
    interactionY: 19,
    shopType: "armor",
    dialogue: [
      "防具屋。頑丈そうな鎧が棚に並んでいる。",
      "店主「この先の砂漠もピラミッドも、装備を整えないと危ないぞ。」",
    ],
  },
];

// buildDesertTownTiles側でだけ使う、上のDESERT_TOWN_SHOPSの当たり判定用データ。
// blockObjectFootprintsがPlacedObject[]しか受け取れないため、見た目と同じ座標・
// サイズでPlacedObject形に詰め直しているだけ（実際の見た目・会話はDESERT_TOWN_SHOPS側）
const DESERT_TOWN_SHOP_FOOTPRINTS: PlacedObject[] = DESERT_TOWN_SHOPS.map((shop) => ({
  id: `${shop.id}-footprint`,
  image: shop.image!,
  x: shop.x,
  y: shop.y,
  widthTiles: shop.widthTiles!,
  heightTiles: shop.heightTiles!,
  collisionWidthTiles: shop.collisionWidthTiles,
  collisionHeightTiles: shop.collisionHeightTiles,
  blocksMovement: true,
}));

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
  ...DESERT_TOWN_TOWER,
  ...DESERT_TOWN_ROCKS,
  ...DESERT_TOWN_TENTS,
];

function buildDesertTownTiles(): TileType[][] {
  const tiles = makeOpenAreaTiles(DESERT_TOWN_WIDTH, DESERT_TOWN_HEIGHT);
  blockObjectFootprints(tiles, [...DESERT_TOWN_OBJECTS, ...DESERT_TOWN_SHOP_FOOTPRINTS]);
  return tiles;
}

export const DESERT_TOWN_FLOOR_TEXTURES: FloorTileType[][] = buildDesertTownFloor();
// 開始位置は縦の大通りの南寄り（フィールドから入ってきたときにここに降りる）
export const DESERT_TOWN_MAP: GridMap = buildAreaMap(buildDesertTownTiles(), { x: 16, y: 20 });

// ============================================================
// 砂漠の町の会話
// ============================================================
export const DESERT_TOWN_INTERACTABLES: Interactable[] = [
  ...DESERT_TOWN_SHOPS,
  {
    id: "desert-town-exit",
    x: 16,
    y: 22,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["砂漠の町を出て、大陸の道へ戻った。"],
  },
  // この旅人が教えてくれる「もり」の言葉を覚えると、フィールドの
  // magic-forest-view（3章「魔法の森」への目印）が実際に入れるようになる
  // （StoryGame.tsxのhandleBump、id==="magic-forest-view"の特別扱い参照）
  {
    id: "desert-traveler",
    x: 16,
    y: 11,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito3.png",
    widthTiles: 1,
    heightTiles: 1,
    teachesWord: { kana: "もり", kanji: "森" },
    dialogue: [
      "旅装束の男が、水を飲みながら休んでいる。",
      "旅人「東からずっと歩いてきたんだが……緑の深い森を越えてきてね。」",
      "旅人「あの『もり』の向こうには、不思議な力を持つ妖精がいるって噂だよ。」",
    ],
  },
];

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
