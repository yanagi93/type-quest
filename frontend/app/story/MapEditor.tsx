"use client";

import { useEffect, useRef, useState } from "react";
import type { FloorTileType, PlacedObject } from "./types";
import { TOWN_FLOOR_TEXTURES, TOWN_MAP, TOWN_OBJECTS, FIELD_FLOOR_TEXTURES, FIELD_MAP, FIELD_OBJECTS } from "./chapter1Data";

// 開発用のマップ下書きツール。実際のゲーム画面（GridExplorer）とは別物で、
// 「床の見た目」「壁の当たり判定」「置物（木・家・岩など）」の3つをマウスで置いて、
// chapter1Data.ts などに貼り付けられるテキストとして書き出すためだけの画面。
// frontend/app/story/MAP_GUIDE.md にこのツールを使った実際のマップ追加手順をまとめてある。

// 実際のゲーム（GridExplorer.tsxのFLOOR_TILE_IMAGES）と同じ画像を使う。
// 単色の四角だと見た目が村マップの実物とズレていたので、本物のテクスチャに差し替えた。
// lake〜floorAccentFlowerは、以前は置物として1マスずつスタンプしていた川・湖・池・
// 砂地・泥地・床飾りを、床として塗れるようにするために追加した
// （GridExplorer.tsxのRANDOM_VARIANT_IMAGES/FLOOR_TILE_IMAGES参照）
const FLOOR_IMAGES: Record<FloorTileType, string> = {
  grass: "/images/map/okimono/tileset/floor_grass.png",
  dirt: "/images/map/okimono/tileset/floor_dirt_brown.png",
  water: "/images/map/okimono/tileset/floor_water_blue.png",
  sand: "/images/map/okimono/tileset/floor_sand_beige.png",
  stone: "/images/map/okimono/tileset/floor_stone_gray.png",
  forest: "/images/map/okimono/tileset/texture_forest_1.png",
  lake: "/images/map/okimono/tileset/texture_lake_water_1.png",
  river: "/images/map/okimono/tileset/texture_river_water_1.png",
  mudPattern: "/images/map/okimono/tileset/texture_mud_pattern_1.png",
  mudPlain: "/images/map/okimono/tileset/texture_mud_plain_1.png",
  sandPattern: "/images/map/okimono/tileset/texture_sand_pattern_1.png",
  sandPlain: "/images/map/okimono/tileset/texture_sand_plain_1.png",
  pondA1: "/images/map/okimono/tileset/texture_pond_a_1.png",
  pondA2: "/images/map/okimono/tileset/texture_pond_a_2.png",
  pondA3: "/images/map/okimono/tileset/texture_pond_a_3.png",
  pondA4: "/images/map/okimono/tileset/texture_pond_a_4.png",
  pondB1: "/images/map/okimono/tileset/texture_pond_b_1.png",
  pondB2: "/images/map/okimono/tileset/texture_pond_b_2.png",
  pondB3: "/images/map/okimono/tileset/texture_pond_b_3.png",
  pondB4: "/images/map/okimono/tileset/texture_pond_b_4.png",
  floorAccentBlue: "/images/map/okimono/tileset/floor_blue_solid.png",
  floorAccentTeal: "/images/map/okimono/tileset/floor_teal_solid.png",
  floorAccentBrownSpeckle: "/images/map/okimono/tileset/floor_brown_speckle.png",
  floorAccentTanSpeckle: "/images/map/okimono/tileset/floor_tan_speckle.png",
  floorAccentGraySpeckle: "/images/map/okimono/tileset/floor_pale_gray_speckle.png",
  floorAccentTealDarkSpeckle: "/images/map/okimono/tileset/floor_teal_dark_speckle.png",
  floorAccentCyanSparkle: "/images/map/okimono/tileset/floor_cyan_sparkle.png",
  floorAccentPurpleSparkle: "/images/map/okimono/tileset/floor_purple_sparkle.png",
  floorAccentFlower: "/images/map/okimono/tileset/floor_dirt_light_flower.png",
};

const FLOOR_LABELS: Record<FloorTileType, string> = {
  grass: "草地",
  dirt: "土の道",
  water: "水面",
  sand: "砂地",
  stone: "岩地",
  forest: "森（生い茂った木々）",
  lake: "湖",
  river: "川",
  mudPattern: "泥地（模様）",
  mudPlain: "泥地（無地）",
  sandPattern: "砂地（模様）",
  sandPlain: "砂地（無地・別色）",
  pondA1: "池A：草多め",
  pondA2: "池A：草と水",
  pondA3: "池A：水多め",
  pondA4: "池A：ほぼ水",
  pondB1: "池B：草多め",
  pondB2: "池B：草と水",
  pondB3: "池B：水多め",
  pondB4: "池B：ほぼ水",
  floorAccentBlue: "床飾り：青（単色）",
  floorAccentTeal: "床飾り：青緑（単色）",
  floorAccentBrownSpeckle: "床飾り：茶（斑点）",
  floorAccentTanSpeckle: "床飾り：ベージュ（斑点）",
  floorAccentGraySpeckle: "床飾り：灰（斑点）",
  floorAccentTealDarkSpeckle: "床飾り：濃青緑（斑点）",
  floorAccentCyanSparkle: "床飾り：水色（きらめき）",
  floorAccentPurpleSparkle: "床飾り：紫（きらめき）",
  floorAccentFlower: "床飾り：花入り草",
};

// 書き出すテキストで使う文字。mapGen.tsのAREA_FLOOR_CHAR_MAPと揃えてある
const FLOOR_CHARS: Record<FloorTileType, string> = {
  grass: ".",
  dirt: "#",
  water: "~",
  sand: "s",
  stone: "o",
  forest: "F",
  lake: "l",
  river: "r",
  mudPattern: "m",
  mudPlain: "M",
  sandPattern: "d",
  sandPlain: "S",
  pondA1: "1",
  pondA2: "2",
  pondA3: "3",
  pondA4: "4",
  pondB1: "5",
  pondB2: "6",
  pondB3: "7",
  pondB4: "8",
  floorAccentBlue: "b",
  floorAccentTeal: "t",
  floorAccentBrownSpeckle: "B",
  floorAccentTanSpeckle: "T",
  floorAccentGraySpeckle: "g",
  floorAccentTealDarkSpeckle: "D",
  floorAccentCyanSparkle: "c",
  floorAccentPurpleSparkle: "u",
  floorAccentFlower: "f",
};

const FLOOR_ORDER: FloorTileType[] = [
  "grass",
  "dirt",
  "water",
  "sand",
  "stone",
  "forest",
  "lake",
  "river",
  "pondA1",
  "pondA2",
  "pondA3",
  "pondA4",
  "pondB1",
  "pondB2",
  "pondB3",
  "pondB4",
  "mudPattern",
  "mudPlain",
  "sandPattern",
  "sandPlain",
  "floorAccentBlue",
  "floorAccentTeal",
  "floorAccentBrownSpeckle",
  "floorAccentTanSpeckle",
  "floorAccentGraySpeckle",
  "floorAccentTealDarkSpeckle",
  "floorAccentCyanSparkle",
  "floorAccentPurpleSparkle",
  "floorAccentFlower",
];

type Brush = { kind: "floor"; floor: FloorTileType } | { kind: "wall"; value: boolean };

const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 15;
// マップ全体をズームアウトして見るとき、横幅がだいたいこのpx数に収まるようにする
const FIT_TARGET_PX = 960;
// 一度に描画するマスの数が多すぎて重くならないようにする上限（フィールドマップの64×48より少し余裕を見た数値）
const MAX_DIMENSION = 120;

const TILESET_DIR = "/images/map/okimono/tileset";

// 置物として選べる画像の一覧。widthTiles/heightTilesは見た目の大きさ（マス単位）、
// blocksMovementはtrueなら当たり判定にもなる（家・木・岩など）、groundLevelは
// 花のように踏んでも通れる背の低い飾り扱いにする（chapter1Data.tsのPlacedObjectと同じ考え方）
type ObjectDef = {
  id: string;
  label: string;
  image: string;
  widthTiles: number;
  heightTiles: number;
  blocksMovement?: boolean;
  groundLevel?: boolean;
  collisionHeightTiles?: number;
};

// 数字違いのバリエーション画像（texture_forest_1〜9など）を1個ずつ書くと量が多すぎるので、
// ベース名・枚数・共通の当たり判定設定だけ渡せばまとめて作れるようにした小さいヘルパー
function textureVariants(
  idPrefix: string,
  labelBase: string,
  fileBase: string,
  count: number,
  opts: { blocksMovement?: boolean; groundLevel?: boolean }
): ObjectDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i + 1}`,
    label: `${labelBase}${i + 1}`,
    image: `${TILESET_DIR}/${fileBase}_${i + 1}.png`,
    widthTiles: 1,
    heightTiles: 1,
    ...opts,
  }));
}

// public/images/map/okimono 以下にある画像を、使う予定が未定のものも含めて全部選べるようにした一覧。
// 用途が想像しにくいものにはコメントで補足している（見た目だけでは分からないものは実際に
// エディタで置いてみて確認してください）。
// 除外したもの：texture_mud_straight_*/texture_sand_straight_*/texture_water_straight_*
// （EDGE_TILE_IMAGES。GridExplorer.tsxが「隣が草かどうか」を見て自動で選ぶ縁専用の絵で、
// 単独で置くと絵が半端に切れて見えるだけなので、置物としては意味を持たないため）
const OBJECT_PALETTE: ObjectDef[] = [
  // --- 村でおなじみの置物 ---
  { id: "tree", label: "木", image: "/images/map/okimono/tree2.png", widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-alt", label: "木（別種）", image: "/images/map/okimono/tree1.png", widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "stone", label: "石", image: "/images/map/okimono/isi.png", widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "flower", label: "花", image: "/images/map/okimono/hana.png", widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "fence", label: "柵", image: "/images/map/okimono/saku.png", widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "flowerbed", label: "花壇", image: "/images/map/okimono/kadan.png", widthTiles: 3, heightTiles: 2, blocksMovement: true },
  { id: "well", label: "井戸", image: "/images/map/okimono/ido.png", widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "house", label: "家", image: "/images/map/okimono/ie.png", widthTiles: 6, heightTiles: 6, blocksMovement: true, collisionHeightTiles: 3 },
  { id: "cave", label: "洞窟", image: "/images/map/okimono/doukutu.png", widthTiles: 7, heightTiles: 7, blocksMovement: true },
  { id: "barrel", label: "樽", image: "/images/map/okimono/taru.png", widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "chest", label: "宝箱", image: "/images/map/okimono/takarabako.png", widthTiles: 1, heightTiles: 1, blocksMovement: true },

  // --- 建物・構造物パーツ（tileset） ---
  { id: "pyramid", label: "ピラミッド", image: `${TILESET_DIR}/icon_pyramid.png`, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "tent", label: "テント", image: `${TILESET_DIR}/icon_tent.png`, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "tower", label: "塔A", image: `${TILESET_DIR}/icon_tower_a_body.png`, widthTiles: 2, heightTiles: 4, blocksMovement: true },
  { id: "tower-b", label: "塔B", image: `${TILESET_DIR}/icon_tower_b_body.png`, widthTiles: 2, heightTiles: 4, blocksMovement: true },
  { id: "tower-top", label: "塔の屋根（塔A/Bと組み合わせ用）", image: `${TILESET_DIR}/icon_tower_shared_top.png`, widthTiles: 2, heightTiles: 1, groundLevel: true },
  // 城は3つのパーツ（土台・屋根2種）を縦に積んで組み立てる想定のセット
  { id: "castle-base", label: "城：土台", image: `${TILESET_DIR}/icon_castle_shared_base.png`, widthTiles: 2, heightTiles: 1, blocksMovement: true },
  { id: "castle-red-roof-bottom", label: "城：赤屋根（下）", image: `${TILESET_DIR}/icon_castle_red_roof_bottom.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "castle-red-roof-top", label: "城：赤屋根（上）", image: `${TILESET_DIR}/icon_castle_red_roof_top.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "castle-cathedral-top", label: "城：大聖堂の屋根", image: `${TILESET_DIR}/icon_castle_cathedral_top.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "castle-towers-top", label: "城：塔の屋根", image: `${TILESET_DIR}/icon_castle_towers_top.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "desert-castle", label: "砂漠の町の城（章1の入口で使用中）", image: `${TILESET_DIR}/castle_desert_town.png`, widthTiles: 1, heightTiles: 2, blocksMovement: true },
  { id: "entrance-a", label: "入口A", image: `${TILESET_DIR}/icon_entrance_a.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "entrance-b", label: "入口B", image: `${TILESET_DIR}/icon_entrance_b.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  // 用途がはっきりしない画像：ファイル名から鍛冶屋の看板と推測。違う用途なら教えてください
  { id: "blacksmith", label: "鍛冶屋？（用途要確認）", image: `${TILESET_DIR}/icon_blacksmith.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true },
  { id: "crate", label: "木箱A", image: `${TILESET_DIR}/icon_crate_a.png`, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "crate-b", label: "木箱B", image: `${TILESET_DIR}/icon_crate_b.png`, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "rubble", label: "瓦礫", image: `${TILESET_DIR}/icon_wall_piece.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },

  // --- 地形・植物（tileset） ---
  { id: "hill", label: "丘（オレンジ）", image: `${TILESET_DIR}/icon_hill_orange.png`, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "hill-gray", label: "丘（灰）", image: `${TILESET_DIR}/icon_hill_gray.png`, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "mound-gray", label: "盛り土（灰・小）", image: `${TILESET_DIR}/icon_mound_gray_small.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "mound-green", label: "盛り土（緑・小）", image: `${TILESET_DIR}/icon_mound_green_small.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "mound-tan", label: "盛り土（茶・小）", image: `${TILESET_DIR}/icon_mound_tan_small.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "tree-bush", label: "茂み", image: `${TILESET_DIR}/icon_tree_bush.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true, collisionHeightTiles: 1 },
  { id: "tree-pine", label: "松の木", image: `${TILESET_DIR}/icon_tree_pine.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true, collisionHeightTiles: 1 },
  { id: "tree-double", label: "木立（2本・草むら用）", image: `${TILESET_DIR}/icon_tree_double.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true, collisionHeightTiles: 1 },
  { id: "tree-double-obj", label: "木立（2本・単体オブジェクト）", image: `${TILESET_DIR}/icon_tree_double_obj.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true, collisionHeightTiles: 1 },
  { id: "tree-single-obj", label: "木（単体オブジェクト）", image: `${TILESET_DIR}/icon_tree_single_obj.png`, widthTiles: 2, heightTiles: 2, blocksMovement: true, collisionHeightTiles: 1 },

  // --- 空の飾り（当たり判定なしの見た目だけの飾り） ---
  { id: "cloud", label: "雲", image: `${TILESET_DIR}/icon_cloud.png`, widthTiles: 2, heightTiles: 1, groundLevel: true },
  { id: "sun", label: "太陽", image: `${TILESET_DIR}/icon_sun.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "moon", label: "三日月", image: `${TILESET_DIR}/icon_moon_crescent.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },
  { id: "sun-or-moon", label: "満月／太陽（丸型）", image: `${TILESET_DIR}/icon_sun_or_moon_full.png`, widthTiles: 1, heightTiles: 1, groundLevel: true },

  // --- 地面アクセント：広域テクスチャ（1マスの絵を何種類か用意してランダムに敷くための素材。
  // chapter1Data.tsのscatterVariedTexture()参照。ここでは1マスずつ手で置ける形にしてある。
  // 川・湖・池・泥地・砂地（模様/無地）・床飾り・森は「床」の筆に移したので、ここには無い
  // （下の床の筆を参照。丘のように盛り上がった見た目の砂丘や山の茂みは、
  // 平らな床画像として敷くと不自然なので置物のまま残してある） ---
  ...textureVariants("mountain", "山肌", "texture_mountain", 9, { blocksMovement: true }),
  ...textureVariants("dune", "砂丘", "texture_sand_dune", 9, { blocksMovement: true }),
];

// 会話ポイントの印。実際のInteractable（NPC・出口・ボスなど）の中身はまだ決めず、
// 「ここに何か会話・イベントを置く予定」というメモだけを残しておくためのもの
type DialogueMarker = { id: string; x: number; y: number; note: string };

function makeGrid<T>(width: number, height: number, value: T): T[][] {
  return Array.from({ length: height }, () => Array<T>(width).fill(value));
}

// 置物の見た目の範囲（矩形）を計算する。x, yは足元のマスなので、下端中央がそのマスの
// 下端中央に来るように逆算する（GridExplorer.tsx / chapter1Data.tsのfootprintOfと同じ式）
function footprintOf(x: number, y: number, widthTiles: number, heightTiles: number) {
  const left = Math.round(x + 0.5 - widthTiles / 2);
  const top = Math.round(y + 1 - heightTiles);
  return { x0: left, y0: top, x1: left + widthTiles - 1, y1: top + heightTiles - 1 };
}

// 既存のグリッドを新しい幅・高さへ変える。左上を基準に、重なる部分はそのまま残し、
// 足りない部分だけ初期値で埋める（描き直さずにマップを広げたり狭めたりできる）
function resizeGrid<T>(grid: T[][], newWidth: number, newHeight: number, fill: T): T[][] {
  return Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) => grid[y]?.[x] ?? fill)
  );
}

export function MapEditor() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [widthInput, setWidthInput] = useState(String(DEFAULT_WIDTH));
  const [heightInput, setHeightInput] = useState(String(DEFAULT_HEIGHT));
  const [tileSize, setTileSize] = useState(28);
  const [floorGrid, setFloorGrid] = useState<FloorTileType[][]>(() =>
    makeGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT, "grass")
  );
  const [wallGrid, setWallGrid] = useState<boolean[][]>(() => makeGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT, false));
  const [brush, setBrush] = useState<Brush>({ kind: "floor", floor: "grass" });
  // "paint": 床/壁を塗るモード。"object": 置物を置く/消すモード。"marker": 会話ポイントの印を置くモード
  const [mode, setMode] = useState<"paint" | "object" | "marker">("paint");
  // trueの間は、paintモードのクリックが1マスずつのドラッグ塗りではなく、
  // クリックしたマスと同じ色（床の種類／壁かどうか）で繋がっている範囲を
  // 一気に塗りつぶす「塗りつぶしツール」になる
  const [fillTool, setFillTool] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState(OBJECT_PALETTE[0].id);
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const objectCounterRef = useRef(0);
  // 会話ポイントの印。まだ会話の中身は作らない段階なので、位置とメモ書きだけ持たせておく
  // （書き出すとInteractable[]の雛形になる）
  const [markers, setMarkers] = useState<DialogueMarker[]>([]);
  const markerCounterRef = useRef(0);
  const [mapName, setMapName] = useState("CHAPTER2_TOWN");
  const [exportText, setExportText] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const isPaintingRef = useRef(false);

  // グリッドの外でマウスを離してもペイントが続いてしまわないように、windowでmouseupを拾う
  useEffect(() => {
    const stop = () => {
      isPaintingRef.current = false;
    };

    window.addEventListener("mouseup", stop);

    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const applyResize = (nextWidth: number, nextHeight: number) => {
    const w = Math.max(3, Math.min(MAX_DIMENSION, Math.round(nextWidth) || 1));
    const h = Math.max(3, Math.min(MAX_DIMENSION, Math.round(nextHeight) || 1));

    setFloorGrid((prev) => resizeGrid(prev, w, h, "grass"));
    setWallGrid((prev) => resizeGrid(prev, w, h, false));
    // 縮めたときに範囲外へはみ出す置物・会話ポイントは取り除く（広げたときはそのまま残る）
    setObjects((prev) => prev.filter((object) => object.x < w && object.y < h));
    setMarkers((prev) => prev.filter((marker) => marker.x < w && marker.y < h));
    setWidth(w);
    setHeight(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
  };

  const paintCell = (x: number, y: number) => {
    if (brush.kind === "floor") {
      setFloorGrid((prev) => {
        if (prev[y][x] === brush.floor) return prev;

        const next = prev.map((row) => row.slice());
        next[y][x] = brush.floor;
        return next;
      });
    } else {
      setWallGrid((prev) => {
        if (prev[y][x] === brush.value) return prev;

        const next = prev.map((row) => row.slice());
        next[y][x] = brush.value;
        return next;
      });
    }
  };

  // クリックしたマスと上下左右に繋がっている「同じ値」のマスをすべて今の筆の値に
  // 塗り替える（ペイントソフトのバケツ塗り）。繋がっていない離れた場所の同じ色までは
  // 塗らない（4方向の連結だけをたどるふつうのflood fill）
  const floodFillFloor = (grid: FloorTileType[][], x: number, y: number, value: FloorTileType) => {
    const target = grid[y][x];
    if (target === value) return grid;

    const next = grid.map((row) => row.slice());
    const stack: [number, number][] = [[x, y]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
      if (next[cy][cx] !== target) continue;

      next[cy][cx] = value;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    return next;
  };

  const floodFillWall = (grid: boolean[][], x: number, y: number, value: boolean) => {
    const target = grid[y][x];
    if (target === value) return grid;

    const next = grid.map((row) => row.slice());
    const stack: [number, number][] = [[x, y]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
      if (next[cy][cx] !== target) continue;

      next[cy][cx] = value;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    return next;
  };

  const fillCell = (x: number, y: number) => {
    if (brush.kind === "floor") {
      setFloorGrid((prev) => floodFillFloor(prev, x, y, brush.floor));
    } else {
      setWallGrid((prev) => floodFillWall(prev, x, y, brush.value));
    }
  };

  // クリックしたマスが、既に置いてある置物の見た目の範囲に重なっていればその置物を取り除く。
  // 重なっていなければ、選んでいる置物をそのマスを足元にして新しく置く（ペイントと違い、
  // 1回のクリックにつき1個だけ。ドラッグで大量に置いてしまわないようにするため）
  const handleObjectClick = (x: number, y: number) => {
    const hit = objects.find((object) => {
      const w = object.collisionWidthTiles ?? object.widthTiles;
      const h = object.collisionHeightTiles ?? object.heightTiles;
      const fp = footprintOf(object.x, object.y, w, h);
      return x >= fp.x0 && x <= fp.x1 && y >= fp.y0 && y <= fp.y1;
    });

    if (hit) {
      setObjects((prev) => prev.filter((object) => object.id !== hit.id));
      return;
    }

    const def = OBJECT_PALETTE.find((d) => d.id === selectedObjectId);
    if (!def) return;

    objectCounterRef.current += 1;
    setObjects((prev) => [
      ...prev,
      {
        id: `${def.id}-${objectCounterRef.current}`,
        image: def.image,
        x,
        y,
        widthTiles: def.widthTiles,
        heightTiles: def.heightTiles,
        blocksMovement: def.blocksMovement,
        groundLevel: def.groundLevel,
        collisionHeightTiles: def.collisionHeightTiles,
      },
    ]);
  };

  // 会話ポイントは大きさを持たない1マスの印なので、置物と違って座標が完全一致するかだけ見ればよい
  const handleMarkerClick = (x: number, y: number) => {
    const hit = markers.find((marker) => marker.x === x && marker.y === y);

    if (hit) {
      setMarkers((prev) => prev.filter((marker) => marker.id !== hit.id));
      return;
    }

    markerCounterRef.current += 1;
    setMarkers((prev) => [...prev, { id: `point-${markerCounterRef.current}`, x, y, note: "" }]);
  };

  const handleMouseDown = (x: number, y: number) => {
    if (mode === "object") {
      handleObjectClick(x, y);
      return;
    }

    if (mode === "marker") {
      handleMarkerClick(x, y);
      return;
    }

    if (fillTool) {
      fillCell(x, y);
      return;
    }

    isPaintingRef.current = true;
    paintCell(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (mode === "paint" && isPaintingRef.current) paintCell(x, y);
  };

  const zoomToFit = (forWidth = width) => {
    setTileSize(Math.max(3, Math.floor(FIT_TARGET_PX / forWidth)));
  };

  const loadExisting = (which: "town" | "field") => {
    const floors = which === "town" ? TOWN_FLOOR_TEXTURES : FIELD_FLOOR_TEXTURES;
    const tiles = which === "town" ? TOWN_MAP.tiles : FIELD_MAP.tiles;
    const objs = which === "town" ? TOWN_OBJECTS : FIELD_OBJECTS;
    const h = floors.length;
    const w = floors[0].length;

    setFloorGrid(floors.map((row) => row.slice()));
    setWallGrid(tiles.map((row) => row.map((tile) => tile === "wall")));
    // 修正済み：以前は「参考表示は床・壁だけ」として置物を読み込んでいなかったが、
    // 実際にchapter1Data.tsへ置いた置物をそのまま見て確認したい場面があるため、
    // 置物（TOWN_OBJECTS/FIELD_OBJECTS）もそのまま読み込むようにした
    setObjects(objs.map((object) => ({ ...object })));
    setMarkers([]);
    setWidth(w);
    setHeight(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
    setMapName(which === "town" ? "TOWN_PREVIEW" : "FIELD_PREVIEW");
    zoomToFit(w);
  };

  const clearGrid = () => {
    setFloorGrid(makeGrid(width, height, "grass"));
    setWallGrid(makeGrid(width, height, false));
    setObjects([]);
    setMarkers([]);
  };

  const buildExport = () => {
    const floorRows = floorGrid.map((row) => row.map((tile) => FLOOR_CHARS[tile]).join(""));
    const wallRows = wallGrid.map((row) => row.map((isWall) => (isWall ? "#" : ".")).join(""));

    const objectLines = objects.map((object) => {
      const fields = [
        `id: "${object.id}"`,
        `image: "${object.image}"`,
        `x: ${object.x}`,
        `y: ${object.y}`,
        `widthTiles: ${object.widthTiles}`,
        `heightTiles: ${object.heightTiles}`,
      ];
      if (object.blocksMovement) fields.push("blocksMovement: true");
      if (object.groundLevel) fields.push("groundLevel: true");
      if (object.collisionHeightTiles) fields.push(`collisionHeightTiles: ${object.collisionHeightTiles}`);
      return `  { ${fields.join(", ")} },`;
    });

    const markerLines = markers.map((marker) => {
      const note = (marker.note.trim() || "TODO：ここに何を置くか決める").replace(/"/g, '\\"');
      return `  { id: "${marker.id}", x: ${marker.x}, y: ${marker.y}, kind: "npc", label: "\u{1F4AC}", dialogue: ["${note}"] },`;
    });

    const floorLegend = FLOOR_ORDER.map((floor) => `${FLOOR_CHARS[floor]} ${FLOOR_LABELS[floor]}`).join(" / ");

    const text = `// ${mapName}  (${width}列 x ${height}行、1マス=?px は好きな値を後で決めてください)
// フィールド用に少し縮尺を変えたい場合は、TILE_SIZE定数を別に用意してください。
// 使い方はフロントエンド側の frontend/app/story/MAP_GUIDE.md を参照。

// --- 床の見た目 ---（mapGen.tsのAREA_FLOOR_CHAR_MAPと同じ文字: ${floorLegend}）
const ${mapName}_FLOOR_ROWS: string[] = [
${floorRows.map((row) => `  "${row}",`).join("\n")}
];

// --- 当たり判定 ---（このエディタ専用の書式: . 床（歩ける）/ # 壁（歩けない））
// GridMap.tilesへ変換するときは '#' → "wall" / '.' → "floor" にするだけでOK
const ${mapName}_WALL_ROWS: string[] = [
${wallRows.map((row) => `  "${row}",`).join("\n")}
];

// --- 置物 ---（PlacedObject[]。blocksMovementが無いものは踏んでも通れる飾り）
// 壁の当たり判定は上のWALL_ROWSで別途表現済みなので、blocksMovement: trueの置物を
// さらに当たり判定に反映させたい場合は、mapGen.tsのblockObjectFootprints()を使ってください
const ${mapName}_OBJECTS: PlacedObject[] = [
${objectLines.length > 0 ? objectLines.join("\n") : "  // （まだ置物はありません）"}
];

// --- 会話ポイント（下書き）---（Interactable[]の雛形。kindやdialogueの中身はあとで仕上げてください。
// メモを空のまま書き出したものは "TODO：..." になっているので検索して埋めていくとよい）
const ${mapName}_INTERACTABLES_TODO: Interactable[] = [
${markerLines.length > 0 ? markerLines.join("\n") : "  // （まだ会話ポイントはありません）"}
];
`;

    setExportText(text);
    setCopyStatus("");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopyStatus("コピーしました");
    } catch {
      setCopyStatus("コピーに失敗しました。下のテキストを手動で選択してコピーしてください");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold">マップエディタ（開発用）</h1>
          <a href="/story" className="text-sm text-sky-300 underline">
            ← ストーリーへ戻る
          </a>
        </div>

        {/* サイズ・ズーム・マップ名の操作 */}
        <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap items-end gap-4 text-sm">
          <div>
            <label className="block text-slate-300 mb-1">幅（マス）</label>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
              onBlur={() => applyResize(Number(widthInput), height)}
              className="w-20 bg-slate-700 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">高さ（マス）</label>
            <input
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              onBlur={() => applyResize(width, Number(heightInput))}
              className="w-20 bg-slate-700 rounded px-2 py-1"
            />
          </div>
          <button
            onClick={() => applyResize(Number(widthInput), Number(heightInput))}
            className="bg-sky-600 hover:bg-sky-500 rounded px-3 py-1.5"
          >
            サイズ変更
          </button>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-slate-300 mb-1">
              ズーム（1マス = {tileSize}px）
            </label>
            <input
              type="range"
              min={3}
              max={48}
              value={tileSize}
              onChange={(e) => setTileSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <button onClick={() => zoomToFit()} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1.5">
            全体表示にズーム
          </button>

          <div>
            <label className="block text-slate-300 mb-1">書き出し名</label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
              className="w-44 bg-slate-700 rounded px-2 py-1"
            />
          </div>
        </div>

        {/* 参考表示・リセット */}
        <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap gap-2 text-sm">
          <span className="text-slate-300 self-center mr-1">既存マップを読み込んで見る:</span>
          <button onClick={() => loadExisting("town")} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1.5">
            村マップ（TOWN_MAP）
          </button>
          <button onClick={() => loadExisting("field")} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1.5">
            フィールドマップ（FIELD_MAP）
          </button>
          <button onClick={clearGrid} className="bg-red-900 hover:bg-red-800 rounded px-3 py-1.5 ml-auto">
            全部消して新規作成
          </button>
        </div>

        {/* モード切り替え：床/壁を塗るか、置物を置くか */}
        <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-300 mr-1">モード:</span>
          <button
            onClick={() => setMode("paint")}
            className="rounded px-3 py-1.5 border-2"
            style={{ borderColor: mode === "paint" ? "#fff" : "transparent", backgroundColor: "#334155" }}
          >
            床・壁を塗る
          </button>
          <button
            onClick={() => setMode("object")}
            className="rounded px-3 py-1.5 border-2"
            style={{ borderColor: mode === "object" ? "#fff" : "transparent", backgroundColor: "#334155" }}
          >
            置物を置く（クリックで設置／既にある置物をクリックで削除）
          </button>
          <button
            onClick={() => setMode("marker")}
            className="rounded px-3 py-1.5 border-2"
            style={{ borderColor: mode === "marker" ? "#fff" : "transparent", backgroundColor: "#334155" }}
          >
            💬 会話ポイントの印を置く（クリックで設置／既にある印をクリックで削除）
          </button>
          <span className="text-slate-400 ml-2">
            置物: {objects.length}個 / 会話ポイント: {markers.length}個
          </span>
        </div>

        {/* 筆（ブラシ）の選択：床・壁モードのときだけ表示 */}
        {mode === "paint" && (
          <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-300 mr-1">塗り方:</span>
            <button
              onClick={() => setFillTool(false)}
              className="rounded px-3 py-1.5 border-2 bg-slate-700"
              style={{ borderColor: !fillTool ? "#fff" : "transparent" }}
            >
              🖌️ ドラッグで塗る
            </button>
            <button
              onClick={() => setFillTool(true)}
              className="rounded px-3 py-1.5 border-2 bg-slate-700"
              style={{ borderColor: fillTool ? "#fff" : "transparent" }}
              title="クリックしたマスと繋がっている同じ色のマスをまとめて塗り替える"
            >
              🪣 塗りつぶし
            </button>

            <span className="text-slate-300 ml-4 mr-1">床の筆:</span>
            {FLOOR_ORDER.map((floor) => (
              <button
                key={floor}
                onClick={() => setBrush({ kind: "floor", floor })}
                className="rounded px-3 py-1.5 flex items-center gap-2 border-2 bg-slate-700"
                style={{
                  borderColor: brush.kind === "floor" && brush.floor === floor ? "#fff" : "transparent",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FLOOR_IMAGES[floor]}
                  alt=""
                  className="w-6 h-6 object-cover rounded-sm"
                  style={{ imageRendering: "pixelated" }}
                />
                {FLOOR_LABELS[floor]}
              </button>
            ))}

            <span className="text-slate-300 ml-4 mr-1">壁の筆:</span>
            <button
              onClick={() => setBrush({ kind: "wall", value: true })}
              className="rounded px-3 py-1.5 border-2 bg-slate-950"
              style={{ borderColor: brush.kind === "wall" && brush.value ? "#fff" : "transparent" }}
            >
              壁にする
            </button>
            <button
              onClick={() => setBrush({ kind: "wall", value: false })}
              className="rounded px-3 py-1.5 border-2 bg-slate-700"
              style={{ borderColor: brush.kind === "wall" && !brush.value ? "#fff" : "transparent" }}
            >
              壁を消す
            </button>
          </div>
        )}

        {/* 置物パレット：置物モードのときだけ表示 */}
        {mode === "object" && (
          <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-300 mr-1">置く置物:</span>
            {OBJECT_PALETTE.map((def) => (
              <button
                key={def.id}
                onClick={() => setSelectedObjectId(def.id)}
                className="rounded px-2 py-1.5 border-2 flex items-center gap-1.5 bg-slate-700"
                style={{ borderColor: selectedObjectId === def.id ? "#fff" : "transparent" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={def.image} alt="" className="w-6 h-6 object-contain" style={{ imageRendering: "pixelated" }} />
                {def.label}
              </button>
            ))}
          </div>
        )}

        {/* 描画グリッド本体 */}
        <div className="bg-black rounded-lg overflow-auto select-none" style={{ maxHeight: "70vh" }}>
          <div
            className="relative"
            style={{ width: width * tileSize, height: height * tileSize }}
            onDragStart={(e) => e.preventDefault()}
          >
            {floorGrid.map((row, y) =>
              row.map((floor, x) => {
                const isWall = wallGrid[y][x];

                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseDown={() => handleMouseDown(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    className="absolute"
                    style={{
                      left: x * tileSize,
                      top: y * tileSize,
                      width: tileSize,
                      height: tileSize,
                      backgroundImage: `url(${FLOOR_IMAGES[floor]})`,
                      backgroundSize: "cover",
                      imageRendering: "pixelated",
                      boxShadow: isWall ? "inset 0 0 0 999px rgba(0,0,0,0.6)" : undefined,
                      outline: tileSize > 8 ? "1px solid rgba(0,0,0,0.15)" : undefined,
                      cursor: "pointer",
                    }}
                  />
                );
              })
            )}

            {/* 置物レイヤー。GridExplorer.tsxと同じ「足元(x, y)を下端中央に揃える」計算で配置する */}
            {objects.map((object) => {
              const w = object.widthTiles * tileSize;
              const h = object.heightTiles * tileSize;
              const left = (object.x + 0.5) * tileSize - w / 2;
              const top = (object.y + 1) * tileSize - h;

              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={object.id}
                  src={object.image}
                  alt=""
                  className="absolute pointer-events-none select-none"
                  style={{ left, top, width: w, height: h, imageRendering: "pixelated" }}
                />
              );
            })}

            {/* 会話ポイントの印。置物レイヤーの上、常に見える位置に表示する */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: marker.x * tileSize,
                  top: marker.y * tileSize,
                  width: tileSize,
                  height: tileSize,
                  fontSize: Math.max(10, tileSize * 0.7),
                  zIndex: 1000,
                }}
              >
                💬
              </div>
            ))}
          </div>
        </div>

        {/* 会話ポイントのメモ一覧：置いてあるときだけ表示 */}
        {markers.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="text-slate-300">
              会話ポイントのメモ（書き出すと Interactable の下書きになります。中身はあとで仕上げてください）
            </div>
            {markers.map((marker) => (
              <div key={marker.id} className="flex items-center gap-2">
                <span className="text-slate-400 w-20 shrink-0">
                  ({marker.x}, {marker.y})
                </span>
                <input
                  type="text"
                  value={marker.note}
                  onChange={(e) =>
                    setMarkers((prev) =>
                      prev.map((m) => (m.id === marker.id ? { ...m, note: e.target.value } : m))
                    )
                  }
                  placeholder="メモ（例: 村人・ひのことば）"
                  className="flex-1 bg-slate-700 rounded px-2 py-1"
                />
                <button
                  onClick={() => setMarkers((prev) => prev.filter((m) => m.id !== marker.id))}
                  className="text-red-400 hover:text-red-300 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 書き出し */}
        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={buildExport} className="bg-emerald-600 hover:bg-emerald-500 rounded px-4 py-2 font-bold">
              テキストとして書き出す
            </button>
            {exportText && (
              <button onClick={copyToClipboard} className="bg-slate-700 hover:bg-slate-600 rounded px-4 py-2">
                コピー
              </button>
            )}
            {copyStatus && <span className="self-center text-sm text-slate-300">{copyStatus}</span>}
          </div>
          {exportText && (
            <textarea
              readOnly
              value={exportText}
              className="w-full h-64 bg-slate-950 text-emerald-300 font-mono text-xs p-3 rounded"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
