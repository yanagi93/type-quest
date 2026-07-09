import type { GridMap, Interactable } from "./types";

// 第1章「はじまりの草原」で使うマップ・インタラクタブルのデータ。

function makeRect(width: number, height: number, gapAt?: { x: number; y: number }) {
  const tiles: GridMap["tiles"] = [];

  for (let y = 0; y < height; y++) {
    const row: GridMap["tiles"][number] = [];

    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isGap = gapAt && gapAt.x === x && gapAt.y === y;

      row.push(isBorder && !isGap ? "wall" : "floor");
    }

    tiles.push(row);
  }

  return tiles;
}

// ============================================================
// 当たり判定（村マップ）の直し方 ガイド
// ============================================================
// この下の TOWN_FLOOR_ROWS が、村の当たり判定そのものです。
// 文字1つ＝マス1つ。"F" = 歩ける床、"#" = 歩けない壁。
// 1行目が一番上（北）、1文字目が一番左（西）に対応しています。
// 例えば3行目・4文字目を直したいなら、TOWN_FLOOR_ROWS[2]という行の
// 文字列の、左から4文字目（インデックス3）を書き換えればOKです。
//
// 「今どのマスが壁で、どのマスが床になっているか」を実際の画面で
// 確認しながら直したいときは、ゲーム中に g キーを押してください。
// 背景画像の上に、壁は赤色・床は緑の枠線で重ねて表示され、
// 一番上の行と一番左の列にマス番号（0始まり）も出ます。
// それを見ながらTOWN_FLOOR_ROWSの該当する文字を書き換えて、
// ブラウザをリロードすれば反映されます。
//
// 家や井戸などの位置（TOWN_INTERACTABLESのx, y）も同じ座標系です。
// 例えば "well"（井戸）は x:10, y:9 なので、
// TOWN_FLOOR_ROWS[9]の左から11文字目（インデックス10）のマスの上に
// 重なっている、という意味になります。インタラクタブルを置く場所は
// 必ず"F"（床）にしてください。"#"（壁）の上に置くと、そのマスに
// 一生たどり着けず、ぶつかることすらできなくなってしまいます。
//
// なお、このTOWN_FLOOR_ROWSは最初から手で書いたものではなく、
// 実際のvillage.png画像（1313x1198px）をcanvasに読み込んで、
// マスごとに「道の砂色かどうか」を自動判定して作ったものを元に、
// 数か所だけ手直ししています。なので多少のズレがあっても
// 元の画像とは無関係な、単純な書き間違いということはないはずです。
// ============================================================

export const TOWN_TILE_SIZE = 48;
export const TOWN_BACKGROUND_IMAGE = "/images/back-ground/village.png";

// 目安用の列番号ルーラー（0〜19）。TOWN_FLOOR_ROWSの各行と
// 文字の位置を対応させて数えるときに使ってください（実際のデータではありません）。
// 列番号:                      "01234567890123456789"
const TOWN_FLOOR_ROWS = [
  "####################", // 0行目
  "####################", // 1行目
  "####################", // 2行目
  "####################", // 3行目
  "#########F#######F##", // 4行目  （F=9: 長老の家への道／F=17: 洞窟への道）
  "#########F#######F##", // 5行目
  "###F#####F######FF##", // 6行目  （F=3: 北西の家／F=16-17: 洞窟）
  "###FFFFFFFFFFFFFF###", // 7行目  （北側の道が合流する横長のエリア）
  "#######FFFFFFFF#####", // 8行目  （広場の上側）
  "#######FF#FFF#######", // 9行目  （広場・井戸はここ）
  "###FFFFFFFFFFFFF####", // 10行目 （広場の下側、左右の家へ広がる）
  "#####FFFFFFFFFFFF###", // 11行目
  "#########F######FF##", // 12行目
  "#########F######FF##", // 13行目
  "####FFFFFF###FFFF###", // 14行目 （下の家3軒のエリア）
  "#########F##FF######", // 15行目
  "#########F##########", // 16行目
  "#########F##########", // 17行目 （南の門）
];

function buildTownTiles(): GridMap["tiles"] {
  return TOWN_FLOOR_ROWS.map((row) =>
    row.split("").map((ch) => (ch === "F" ? "floor" : "wall"))
  );
}

export const TOWN_MAP: GridMap = {
  tiles: buildTownTiles(),
  start: { x: 10, y: 10 },
};

export const TOWN_INTERACTABLES: Interactable[] = [
  {
    id: "well",
    x: 10,
    y: 9,
    kind: "object",
    label: "",
    teachesWord: { kana: "みず", kanji: "水" },
    dialogue: [
      "広場の井戸をのぞきこんだ。",
      "冷たい水がこんこんと湧いている。",
      "「みず」という言霊を思い出した気がする。",
    ],
  },
  {
    id: "house-elder",
    x: 9,
    y: 4,
    kind: "npc",
    label: "",
    dialogue: [
      "長老の家だ。",
      "長老「言霊の書を手掛かりに、村の中や外を歩いて言葉を探すのじゃ。」",
    ],
  },
  {
    id: "house-fire",
    x: 14,
    y: 7,
    kind: "npc",
    label: "",
    teachesWord: { kana: "ひ", kanji: "火" },
    dialogue: [
      "暖炉のある家だ。",
      "村人「この火を見ていると、なぜか懐かしい気持ちになるんだ。」",
      "「ひ」という言霊を思い出した気がする。",
    ],
  },
  {
    id: "house-wind",
    x: 3,
    y: 10,
    kind: "npc",
    label: "",
    teachesWord: { kana: "かぜ", kanji: "風" },
    dialogue: [
      "旅人風の村人が窓辺に立っている。",
      "村人「外の風に当たると、いつも昔のことを思い出すんだ。」",
      "「かぜ」という言霊を思い出した気がする。",
    ],
  },
  {
    id: "house-nw",
    x: 6,
    y: 7,
    kind: "npc",
    label: "",
    dialogue: ["村人「おはよう。今日もいい天気だね。」"],
  },
  {
    id: "house-e",
    x: 14,
    y: 10,
    kind: "npc",
    label: "",
    dialogue: ["村人「この村は静かでいいところだよ。」"],
  },
  {
    id: "house-sw",
    x: 5,
    y: 14,
    kind: "npc",
    label: "",
    dialogue: ["村人「魔物が村を襲った夜は、本当に怖かったよ……」"],
  },
  {
    id: "house-s",
    x: 9,
    y: 15,
    kind: "npc",
    label: "",
    dialogue: ["村人「言霊が戻れば、また昔のように歌を歌えるのかねぇ。」"],
  },
  {
    id: "house-se",
    x: 14,
    y: 14,
    kind: "npc",
    label: "",
    dialogue: ["村人「気をつけて行っておいで。」"],
  },
  {
    id: "pond",
    x: 4,
    y: 7,
    kind: "object",
    label: "",
    dialogue: ["澄んだ池だ。小さな魚が泳いでいる。"],
  },
  {
    id: "cave",
    x: 17,
    y: 6,
    kind: "object",
    label: "",
    dialogue: [
      "紫色の岩でできた、不気味な洞窟の入り口だ。",
      "入り口は固く閉ざされていて、今は入れそうにない……。",
    ],
  },
  {
    id: "town-exit",
    x: 9,
    y: 17,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["村の門をくぐり、草原の外へ出た。"],
  },
];

export const FIELD_MAP: GridMap = {
  tiles: makeRect(11, 9),
  start: { x: 1, y: 7 },
};

// フィールドから村へ戻ったときに立つ位置。
// (9,16)は左右が壁・上下がインタラクタブルで完全な行き止まりになってしまうため、
// 少なくとも1方向（左・上）へ動ける(9,14)にしている
export const TOWN_REENTRY_POS = { x: 9, y: 14 };

export const FIELD_TOWN_ENTRANCE: Interactable = {
  id: "field-town-entrance",
  x: 1,
  y: 6,
  kind: "exit",
  label: "🚪",
  exitsTo: "town",
  dialogue: ["村の門をくぐり、中へ戻った。"],
};

export const FIELD_BOSS: Interactable = {
  id: "slime-king",
  x: 9,
  y: 1,
  kind: "boss",
  label: "👑",
  dialogue: [
    "……何か強大な気配がする。",
    "もう少し言葉を集めてから来た方が良さそうだ。",
  ],
};

export const FIELD_INTERACTABLES: Interactable[] = [FIELD_TOWN_ENTRANCE, FIELD_BOSS];

// ボスに挑めるようになる条件（覚えた単語の数）
export const BOSS_UNLOCK_WORD_COUNT = 3;

// 第1章で手に入る可能性のある言霊（言葉）の一覧。
// state.wordsLearned にはkana（読み）だけが入っているので、
// 「覚えた言葉一覧」画面で漢字・意味を表示するためにここで対応表を持っておく。
// ここに載っている単語がその章で手に入る単語の「全部」なので、
// 新しく単語を覚えさせる場所（家・井戸・ボス撃破など）を増やしたときは、
// 必ずこのリストにも追加すること（忘れると一覧画面に表示されなくなる）。
export type CollectibleWord = {
  kana: string;
  kanji: string;
  // どこで手に入るかのヒント（一覧画面でまだ持っていない単語のヒントとして表示する）
  hint: string;
};

export const CHAPTER1_WORD_DICTIONARY: CollectibleWord[] = [
  { kana: "みず", kanji: "水", hint: "村の広場の井戸" },
  { kana: "ひ", kanji: "火", hint: "暖炉のある家" },
  { kana: "かぜ", kanji: "風", hint: "旅人風の村人がいる家" },
  { kana: "ゆうき", kanji: "勇気", hint: "スライムキングを倒す" },
];
