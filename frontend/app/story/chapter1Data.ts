import type { FloorTileType, GridMap, Interactable, PlacedObject, WandererDefinition } from "./types";

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
// 当たり判定（村マップ）の仕組み
// ============================================================
// 以前はTOWN_FLOOR_ROWSという当たり判定専用のASCII表を手書きしていたが、
// 「家を動かしたのに当たり判定を直し忘れる」「置物と当たり判定がズレる」
// という事故が何度も起きたため、今は当たり判定を手書きせず、
// 実際に置いてある家・木・柵・石・花壇の位置と大きさから自動計算している
// （下のbuildTownCollision関数）。なので、家や木の座標（x, y）を変えれば
// 当たり判定も自動でついてくる。個別にASCII表を直す必要はない。
//
// ルール:
// ・草地はどこでも歩ける（TOWN_INTERACTABLESやTOWN_OBJECTSが無いマスは全部床）
// ・家・井戸・洞窟などのインタラクタブル（image付き）は、見た目の範囲がまるごと
//   壁になる。ただし会話にぶつかれるように、足元のマス(x, y)自体は床のまま残す
// ・TOWN_OBJECTSのうち blocksMovement: true の置物（木・柵・石・花壇）も、
//   見た目の範囲がまるごと壁になる
// ・花（hana.png）は blocksMovement を付けていないので、踏んでも通り抜けられる
//
// マス目は48列 x 44行。ゲーム中に g キーを押すと、実際にどのマスが壁になって
// いるか（赤）を背景に重ねて確認できる。
// ============================================================

export const TOWN_TILE_SIZE = 48;
const TOWN_GRID_WIDTH = 48;
const TOWN_GRID_HEIGHT = 44;

export const TOWN_INTERACTABLES: Interactable[] = [
  {
    id: "well",
    x: 23,
    y: 24,
    kind: "object",
    label: "",
    image: "/images/map/okimono/ido.png",
    widthTiles: 3,
    heightTiles: 3,
    // 木のてっぺんと同じ理由で、井戸も一番上の段だけ当たり判定を外している
    collisionHeightTiles: 2,
    teachesWord: { kana: "みず", kanji: "水" },
    dialogue: [
      "広場の井戸をのぞきこんだ。冷たい水がこんこんと湧いている。",
      "コト「これは……『みず』っていう言霊だよ！」",
    ],
  },
  {
    id: "house-elder",
    x: 22,
    y: 7,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 21,
    interactionY: 7,
    dialogue: [
      "長老の家だ。",
      "長老「言霊の書を手掛かりに、村の中や外を歩いて言葉を探すのじゃ。」",
    ],
  },
  {
    id: "house-fire",
    x: 30,
    y: 13,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 29,
    interactionY: 13,
    teachesWord: { kana: "ひ", kanji: "火" },
    dialogue: [
      "暖炉のある家だ。村人が暖炉のほうを指差して、何か伝えたそうにしている。",
      "コト「あったかい火だね。……これは『ひ』っていう言霊だよ！」",
    ],
  },
  {
    id: "house-wind",
    x: 7,
    y: 24,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 6,
    interactionY: 24,
    teachesWord: { kana: "かぜ", kanji: "風" },
    dialogue: [
      "旅人風の村人が窓辺に立って、外を見つめている。",
      "コト「気持ちよさそうな風……これは『かぜ』っていう言霊だよ！」",
    ],
  },
  {
    id: "house-nw",
    x: 14,
    y: 14,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 13,
    interactionY: 14,
    dialogue: ["誰もいないようだ。住人は村のどこかを歩き回っているらしい。"],
  },
  {
    id: "house-e",
    x: 33,
    y: 24,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 32,
    interactionY: 24,
    dialogue: ["誰もいないようだ。住人は村のどこかを歩き回っているらしい。"],
  },
  {
    id: "house-sw",
    x: 8,
    y: 32,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 7,
    interactionY: 32,
    dialogue: ["誰もいないようだ。住人は村のどこかを歩き回っているらしい。"],
  },
  {
    id: "house-s",
    x: 18,
    y: 32,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 17,
    interactionY: 32,
    dialogue: ["誰もいないようだ。住人は村のどこかを歩き回っているらしい。"],
  },
  {
    id: "house-se",
    x: 34,
    y: 33,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 33,
    interactionY: 33,
    dialogue: ["誰もいないようだ。住人は村のどこかを歩き回っているらしい。"],
  },
  {
    id: "pond",
    x: 5,
    y: 8,
    kind: "object",
    label: "",
    // imageは持たない（見た目は床レイヤーの水面テクスチャで表現する）が、
    // widthTiles/heightTilesだけ指定して、水面の範囲に入れないようにする
    widthTiles: 5,
    heightTiles: 3,
    dialogue: ["澄んだ池だ。小さな魚が泳いでいる。"],
  },
  {
    id: "cave",
    x: 41,
    y: 8,
    kind: "object",
    label: "",
    image: "/images/map/okimono/doukutu.png",
    widthTiles: 7,
    heightTiles: 7,
    // 洞窟自体は謎の力にふさがれていて、いずれ後の章で開放する予定の伏線。
    // コトが直接止めてくれることで、単なる「入れません」の壁ではなく
    // 物語上の理由がある演出にしている（getPortraitsForInteractableで
    // 主人公・コトの立ち絵を出す）
    dialogue: [
      "紫色の岩でできた、不気味な洞窟の入り口だ。",
      "岩の隙間から、禍々しい力が漏れ出しているのが分かる。",
      "コト「待って！　今の私たちじゃ、まだこの力には勝てない。」",
      "コト「もっと言葉を集めて、力をつけてから来よう。」",
    ],
  },
  {
    id: "town-exit",
    x: 22,
    y: 42,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["村の門をくぐり、草原の外へ出た。"],
  },
  // 謎の青年。村人なのに、なぜか昔の言葉を知っている。動き回らず村の門の近くに
  // ずっと立っていて、まるで主人公を見守っているかのように話しかけてくる
  {
    id: "stranger",
    x: 26,
    y: 38,
    kind: "npc",
    label: "👤",
    // 顔を隠したフード姿（syoutai=正体 版ではなくnumei=不明 版）。
    // 会話用の立ち絵（StoryGame.tsxのSTRANGER_PORTRAIT_IMAGE）も同じ「不明」の
    // 方にそろえてあるので、マップと会話で見た目が食い違わない
    image: "/images/map/mura/nazosyounennumei.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["旅人風の青年が、静かにこちらを見ている。", "青年「旅は楽しい？」", "青年「焦らなくていい。君なら大丈夫。」"],
  },
  // 樽。中身に「攻撃力の書」「防御力の書」「体力の書」のどれが入っているかを
  // grantsItemで指定する（中身の説明はここではなく、実際に手に入れたときの
  // メッセージをStoryGame.tsxが組み立てる。同じ樽からは一度しかもらえない）。
  // 見た目は樽だが、内部の状態名（openChest/chestsOpened等）は元の「宝箱」の
  // ままにしてある。プレイヤーに見える部分だけ樽の演出に差し替えている。
  // それぞれ近くの家の脇に置いてある（以前は家から離れた変な場所にあった）
  {
    id: "barrel-1",
    x: 23,
    y: 8,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "attack",
    dialogue: ["長老の家の脇に、古い樽が置いてある。", "コト「開けてみるね……」"],
  },
  {
    id: "barrel-2",
    x: 8,
    y: 25,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "defense",
    dialogue: ["家の裏に、苔むした樽が置いてある。", "コト「開けてみるね……」"],
  },
  {
    id: "barrel-3",
    x: 31,
    y: 14,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "hp",
    dialogue: ["家のそばに、しっかりした樽が置いてある。", "コト「開けてみるね……」"],
  },
  // 木・花・草。井戸と同じく、専用の画像は置かずコトが教えてくれるだけの
  // シンプルな発見スポット（widthTiles/heightTilesを持たないので当たり判定には
  // 影響しない。既にある木・花壇の近くに置いてある）
  {
    id: "tree-word",
    x: 17,
    y: 5,
    kind: "object",
    label: "🌳",
    teachesWord: { kana: "き", kanji: "木" },
    dialogue: ["大きな木が影を作っている。", "コト「大きな木……これは『き』っていう言霊だよ！」"],
  },
  {
    id: "flower-word",
    x: 26,
    y: 12,
    kind: "object",
    label: "🌸",
    teachesWord: { kana: "はな", kanji: "花" },
    dialogue: ["色とりどりの花が咲いている。", "コト「きれいな花……これは『はな』っていう言霊だよ！」"],
  },
  {
    id: "grass-word",
    x: 12,
    y: 20,
    kind: "object",
    label: "🌿",
    teachesWord: { kana: "くさ", kanji: "草" },
    dialogue: ["風にそよぐ草むらだ。", "コト「やわらかい草……これは『くさ』っていう言霊だよ！」"],
  },
];

// ============================================================
// 村を歩き回るNPC（村人・猫・犬）の置き方 ガイド
// ============================================================
// TOWN_INTERACTABLESと違って、こちらは決まった位置に留まらず、
// spawnX, spawnYを中心にwanderRadiusマス以内をランダムに歩き回る
// （実際の移動処理はuseWanderers.ts）。話しかける（ぶつかる）と
// dialogueが表示されるのはTOWN_INTERACTABLESと同じ。
// 家の住人だった5人の村人は、家の中で待つのではなく家のまわりを
// 歩き回るようにしてある（家自体にはもう誰もいない）。
//
// マップ用のimageは、会話用の立ち絵（StoryGame.tsxのVILLAGER_PORTRAIT_IMAGES）と
// 同一人物になるように選んである。mura/murabito1.png（お年寄りの農夫風）は、
// 対応する会話用の絵が無い（kaiwaのmurabito1/2は長老専用のおばあさん）ため、
// 歩き回る村人には使っていない。実際に使っているのは
// mura/murabito2.png（ひげの職人風）とmura/murabito3.png（少年風）の2人だけで、
// 同じ人物が村のあちこちに複数人いる体にしてある
export const TOWN_WANDERERS: WandererDefinition[] = [
  {
    id: "wanderer-nw",
    spawnX: 13,
    spawnY: 15,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito2.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["村人「……あ……」", "うまく言葉にならないようだ。この世界では、言葉の力が失われてしまっている。"],
  },
  {
    id: "wanderer-e",
    spawnX: 32,
    spawnY: 25,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito3.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["村人「う……、う……」", "何かを伝えたそうだが、言葉が出てこないらしい。"],
  },
  {
    id: "wanderer-sw",
    spawnX: 7,
    spawnY: 33,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito2.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["村人「……あ、あ……」", "何か辛いことを思い出しているような表情だが、言葉にはならない。"],
  },
  {
    id: "wanderer-s",
    spawnX: 17,
    spawnY: 33,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito3.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["村人「う、うー……」", "小さく鼻歌のようなものを口ずさんでいる。歌詞は、もう思い出せないようだ。"],
  },
  {
    id: "wanderer-se",
    spawnX: 33,
    spawnY: 34,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito2.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["村人「……あ。」", "小さく手を振ってくれた。言葉は交わせなくても、気持ちは伝わってくる。"],
  },
  {
    id: "wanderer-cat",
    spawnX: 20,
    spawnY: 19,
    wanderRadius: 6,
    kind: "npc",
    label: "🐱",
    image: "/images/map/mura/neko.png",
    widthTiles: 1,
    heightTiles: 1,
    teachesWord: { kana: "ねこ", kanji: "猫" },
    dialogue: [
      "村の猫が、のんびり歩き回っている。",
      "コト「にゃあ……あ、鳴き声だ！ これは『ねこ』っていう言霊だよ！」",
    ],
  },
  {
    id: "wanderer-dog",
    spawnX: 27,
    spawnY: 19,
    wanderRadius: 6,
    kind: "npc",
    label: "🐶",
    image: "/images/map/mura/dog.png",
    widthTiles: 1,
    heightTiles: 1,
    teachesWord: { kana: "いぬ", kanji: "犬" },
    dialogue: [
      "村の犬が、しっぽを振りながら駆け寄ってきた。",
      "コト「わんわん！ これは『いぬ』っていう言霊だよ！」",
    ],
  },
  // ポーションをくれる村人。他の村人と同じく歩き回るNPCにしてあり、
  // 見た目も他の村人と同じ画像を使い回している。grantsItemは樽と同じ
  // 仕組みをそのまま使うので、一度もらったら二度目は空振りになる
  {
    id: "wanderer-potion",
    spawnX: 33,
    spawnY: 25,
    wanderRadius: 5,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito3.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "potion",
    dialogue: [
      "村人が、心配そうな顔でこちらを見ている。",
      "村人「旅は大変じゃろう……これを持っていきなさい。」",
    ],
  },
];

// ============================================================
// 見た目だけの置物（木・花・柵・石など）の置き方 ガイド
// ============================================================
// ここは会話を持たない置物。x, yはその置物の「足元」のマス（下端中央がそのマスの
// 下端中央に来るように自動で配置される）。widthTiles/heightTilesは見た目の大きさ
// （マス単位）。画像は public/images/map/okimono/ 以下のファイルをそのまま指定できる。
//
// blocksMovement: true にすると、その置物の見た目の範囲が当たり判定でも壁として
// 扱われる（木・柵・石・花壇のような「ぶつかる」もの用）。付けなければ花のように
// 踏んで通り抜けられる飾りになる。
//
// 木のように「同じ画像・同じ大きさのものを大量に置きたい」場合は、
// 下のscatterObjects関数を使うと、[x, y]の座標だけを並べればよくなります
// （idや画像名・大きさを1個ずつ書かなくてよい）。
function scatterObjects(
  idPrefix: string,
  image: string,
  size: {
    widthTiles: number;
    heightTiles: number;
    groundLevel?: boolean;
    blocksMovement?: boolean;
    collisionWidthTiles?: number;
    collisionHeightTiles?: number;
  },
  positions: [number, number][]
): PlacedObject[] {
  return positions.map(([x, y], index) => ({
    id: `${idPrefix}-${index}`,
    image,
    x,
    y,
    widthTiles: size.widthTiles,
    heightTiles: size.heightTiles,
    groundLevel: size.groundLevel,
    blocksMovement: size.blocksMovement,
    collisionWidthTiles: size.collisionWidthTiles,
    collisionHeightTiles: size.collisionHeightTiles,
  }));
}

// 木を置きたい場所。増やしたいときはこの配列に [x, y] を追加するだけでいい。
// 北の境界沿い(y:2)と、南の境界沿い(y:39,41,43。中央の村の出口x:22周辺は開けてある)に配置済み。
// 木の当たり判定は幹の部分（見た目の下側）だけで、てっぺん（見た目の上側）には無い
// （下のTREE_SIZEのcollisionHeightTiles参照）。てっぺんの葉が主人公にかぶさる形に
// なるので、木の裏側を歩いているように見える。
const TREE_POSITIONS: [number, number][] = [
  [0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2],
  [16, 2], [18, 2], [20, 2], [22, 2], [24, 2], [26, 2], [28, 2], [30, 2],
  [32, 2], [34, 2], [36, 2], [38, 2], [40, 2], [42, 2], [44, 2], [46, 2],
  [0, 44], [2, 44], [4, 44], [6, 44], [8, 44], [10, 44], [12, 44], [14, 44],
  [16, 44], [18, 44], [20, 44], [26, 44], [28, 44], [30, 44], [32, 44], [34, 44],
  [36, 44], [38, 44], [40, 44], [42, 44], [44, 44], [46, 44], [0, 42], [2, 42],
  [4, 42], [6, 42], [8, 42], [10, 42], [12, 42], [14, 42], [16, 42], [18, 42],
  [20, 42], [26, 42], [28, 42], [30, 42], [32, 42], [34, 42], [36, 42], [38, 42],
  [40, 42], [42, 42], [44, 42], [46, 42], [2, 40], [4, 40], [6, 40],
  [8, 40], [10, 40], [12, 40], [14, 40], [16, 40], [18, 40], [20, 40], [26, 40],
  [28, 40], [30, 40], [32, 40], [34, 40], [36, 40], [38, 40], [40, 40], [42, 40],
  [44, 40], [46, 40], [0, 4], [0, 6], [0, 8], [0, 10], [0, 12], [0, 14],
  [0, 16], [0, 18], [0, 20], [0, 22], [0, 24], [0, 26], [0, 28], [0, 30],
  [0, 32], [0, 34], [0, 36], [0, 38], [0, 40], [46, 4], [46, 6], [46, 8], [46, 10], [46, 12], [46, 14],
  [46, 16], [46, 18], [46, 20], [46, 22], [46, 24], [46, 26], [46, 28], [46, 30],
  [46, 32], [46, 34], [46, 36], [46, 38], [46, 40],
];

// 木（tree2.png、3x3マス）の共通サイズ。collisionHeightTilesをheightTilesより
// 小さくして、見た目の一番上の段（てっぺん）だけ当たり判定を外している。
const TREE_SIZE = { widthTiles: 3, heightTiles: 3, collisionHeightTiles: 2, blocksMovement: true };

// 花（hana.png）を置きたい場所。花壇と違って背が低いので、GridExplorer.tsx側で
// groundLevel: true にして常に主人公の背景（奥）に敷いている（主人公が花の上を
// 歩いても不自然に隠れたりしない）。増やしたいときはこの配列に [x, y] を足すだけでいい。
// 参考にした画像（village.png）のように、それぞれの家の近くに1〜2個ずつ散らしてある。
const FLOWER_POSITIONS: [number, number][] = [
  [18, 11], [26, 7], [25, 12], [4, 17], [8, 11],
  [37, 22], [14, 30], [25, 28], [41, 27], [3, 6], [8, 6],
];

// 石（isi.png）を置きたい場所
const STONE_POSITIONS: [number, number][] = [
  [22, 29], [2, 9],
];

// 柵（saku.png）を置きたい場所。家の脇に添える飾りと、南の門の両脇に配置
const FENCE_POSITIONS: [number, number][] = [
  [17, 3], [26, 3], [34, 10], [3, 22], [18, 11],
  [38, 21], [4, 29], [22, 29], [38, 26], [20, 41], [24, 41],
];

// 木（大きめのtree2.png）を、境界だけでなく家の近くにも点在させる
const INNER_TREE_POSITIONS: [number, number][] = [
  [17, 4], [35, 12], [2, 26], [19, 13], [3, 34], [21, 36],
];

export const TOWN_OBJECTS: PlacedObject[] = [
  ...scatterObjects("tree", "/images/map/okimono/tree2.png", TREE_SIZE, TREE_POSITIONS),
  ...scatterObjects("inner-tree", "/images/map/okimono/tree2.png", TREE_SIZE, INNER_TREE_POSITIONS),
  ...scatterObjects("flower", "/images/map/okimono/hana.png", { widthTiles: 2, heightTiles: 2, groundLevel: true }, FLOWER_POSITIONS),
  ...scatterObjects("stone", "/images/map/okimono/isi.png", { widthTiles: 1, heightTiles: 1, blocksMovement: true }, STONE_POSITIONS),
  ...scatterObjects("fence", "/images/map/okimono/saku.png", { widthTiles: 1, heightTiles: 1, blocksMovement: true }, FENCE_POSITIONS),
  { id: "flowerbed-elder", image: "/images/map/okimono/kadan.png", x: 27, y: 6, widthTiles: 3, heightTiles: 2, blocksMovement: true },
  { id: "flowerbed-cave", image: "/images/map/okimono/kadan.png", x: 44, y: 11, widthTiles: 3, heightTiles: 2, blocksMovement: true },
];

// 置物の見た目の範囲（マス目の矩形）を計算する。x, yは足元のマスなので、
// 下端中央がそのマスの下端中央に来るように逆算する（GridExplorer.tsxの描画と同じ式）
function footprintOf(x: number, y: number, widthTiles: number, heightTiles: number) {
  const left = Math.round(x + 0.5 - widthTiles / 2);
  const top = Math.round(y + 1 - heightTiles);
  return { left, right: left + widthTiles, top, bottom: top + heightTiles };
}

// 村の当たり判定を、実際に置いてある家・木・柵・石・花壇の位置から自動計算する。
// 「参考にする」対象を増減させたいときはTOWN_INTERACTABLES / TOWN_OBJECTS側を直せばよく、
// このマス目データ自体を手で書き換える必要はない。
function buildTownTiles(): GridMap["tiles"] {
  const tiles: GridMap["tiles"] = Array.from({ length: TOWN_GRID_HEIGHT }, () =>
    Array<GridMap["tiles"][number][number]>(TOWN_GRID_WIDTH).fill("floor")
  );

  const blockFootprint = (
    x: number,
    y: number,
    widthTiles: number,
    heightTiles: number,
    keepCell?: { x: number; y: number }
  ) => {
    const fp = footprintOf(x, y, widthTiles, heightTiles);

    for (let yy = fp.top; yy < fp.bottom; yy++) {
      for (let xx = fp.left; xx < fp.right; xx++) {
        if (yy < 0 || yy >= TOWN_GRID_HEIGHT || xx < 0 || xx >= TOWN_GRID_WIDTH) continue;
        if (keepCell && xx === keepCell.x && yy === keepCell.y) continue; // ここだけ床のまま残して会話にぶつかれるようにする

        tiles[yy][xx] = "wall";
      }
    }
  };

  // 家・井戸・洞窟・池：ぶつかり判定の基準点（interactionX/Y。無ければx, y）だけ
  // 床を残し、それ以外の範囲（collisionWidthTiles/Heightsが無ければ見た目の
  // widthTiles/heightTilesと同じ）を壁にする。imageが無いもの（池など）も対象。
  // footprintOfは常に足元(x, y)を下端に揃えて計算するので、collisionHeightTilesを
  // widthTiles/heightTilesより小さくするだけで、見た目の下側（壁がある部分）だけを
  // 塞ぎ、上側（屋根の裏など何もない部分）は自動的に塞がれずに残る。
  for (const interactable of TOWN_INTERACTABLES) {
    const w = interactable.collisionWidthTiles ?? interactable.widthTiles;
    const h = interactable.collisionHeightTiles ?? interactable.heightTiles;

    if (!w || !h) continue;

    const keepCell = {
      x: interactable.interactionX ?? interactable.x,
      y: interactable.interactionY ?? interactable.y,
    };

    blockFootprint(interactable.x, interactable.y, w, h, keepCell);
  }

  // 木・柵・石・花壇など、blocksMovement: true の置物は見た目の範囲を壁にする。
  // collisionWidthTiles/collisionHeightTilesがあれば（木のてっぺんなど）それを優先し、
  // 無ければ見た目の範囲（widthTiles/heightTiles）をまるごと壁にする
  for (const object of TOWN_OBJECTS) {
    if (!object.blocksMovement) continue;

    const w = object.collisionWidthTiles ?? object.widthTiles;
    const h = object.collisionHeightTiles ?? object.heightTiles;

    blockFootprint(object.x, object.y, w, h);
  }

  // 外周1マスは、木の隙間があっても外へ出られないように必ず壁にしておく安全策
  for (let x = 0; x < TOWN_GRID_WIDTH; x++) {
    tiles[0][x] = "wall";
    tiles[TOWN_GRID_HEIGHT - 1][x] = "wall";
  }
  for (let y = 0; y < TOWN_GRID_HEIGHT; y++) {
    tiles[y][0] = "wall";
    tiles[y][TOWN_GRID_WIDTH - 1] = "wall";
  }

  return tiles;
}

// ============================================================
// 床の見た目（草・土の道・水面）
// ============================================================
// 当たり判定とは別に「どの床画像を敷くか」だけを決めるデータ。歩けるかどうかには
// 関係しない（土の道の外を歩いても、水面の上を歩いても、当たり判定的には問題ない）。
// 見た目だけの問題なので、以前のように道を自動計算するのではなく、下のASCIIマップ
// (TOWN_FLOOR_ROWS)を直接書き換える方式にしてある。1文字が1マスに対応していて、
// 見たままの形がゲーム内の道の形になる。
//
// 使える文字（他の文字を使うと開発時にエラーで教えてくれる）:
//   .  草地
//   #  土の道
//   ~  水面
//
// 1行が48文字（TOWN_GRID_WIDTH）、44行（TOWN_GRID_HEIGHT）ちょうどである必要がある。
// 下のルーラー（列番号の目安）と、TOWN_INTERACTABLES / TOWN_OBJECTSに書いてある
// x, y座標を見比べながら編集するとよい（例: house-elderはx:22, y:7辺りにあるので、
// 22列目・7行目あたりに道を通したいならそのあたりの'.'を'#'に変える）。
//
//              0         1         2         3         4
//              0123456789012345678901234567890123456789012345678
const TOWN_FLOOR_ROWS: string[] = [
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "...~~~~~........................................",
  "...~~~~~.............####.......................",
  "...~~~~~............#####.......................",
  ".....######################################.....",
  ".....######################################.....",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................#######..................",
  ".............#################..................",
  ".............############.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".....................######.....................",
  ".....................######.....................",
  ".....................######.....................",
  "......#####################.....................",
  "......###############################...........",
  ".....................#################..........",
  ".......................##...........###.........",
  ".......................##............###........",
  ".......................##.............##........",
  ".......................##.............##........",
  ".......................##.............##........",
  ".......................##.............##........",
  ".......##################............###........",
  ".......################################.........",
  ".......................###############..........",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  ".......................##.......................",
  "......................###.......................",
  "......................##........................",
];

const FLOOR_CHAR_MAP: Record<string, FloorTileType> = {
  ".": "grass",
  "#": "dirt",
  "~": "water",
};

function parseTownFloorRows(rows: string[]): FloorTileType[][] {
  if (rows.length !== TOWN_GRID_HEIGHT) {
    throw new Error(`TOWN_FLOOR_ROWSは${TOWN_GRID_HEIGHT}行である必要があります（実際: ${rows.length}行）`);
  }

  return rows.map((row, y) => {
    if (row.length !== TOWN_GRID_WIDTH) {
      throw new Error(`TOWN_FLOOR_ROWSの${y}行目は${TOWN_GRID_WIDTH}文字である必要があります（実際: ${row.length}文字）`);
    }

    return row.split("").map((char, x) => {
      const tile = FLOOR_CHAR_MAP[char];

      if (!tile) {
        throw new Error(`TOWN_FLOOR_ROWSの(${x}, ${y})に不明な文字「${char}」があります。使えるのは ".", "#", "~" のみです`);
      }

      return tile;
    });
  });
}

export const TOWN_FLOOR_TEXTURES: FloorTileType[][] = parseTownFloorRows(TOWN_FLOOR_ROWS);

// 開始位置は井戸の広場のすぐ南（井戸自体は3x3の当たり判定を持つのでそこは避けている）
export const TOWN_MAP: GridMap = {
  tiles: buildTownTiles(),
  start: { x: 24, y: 26 },
};

export const FIELD_MAP: GridMap = {
  tiles: makeRect(11, 9),
  start: { x: 1, y: 7 },
};

// フィールドから村へ戻ったときに立つ位置。
// 左右が壁・上下がインタラクタブルの行き止まりを避け、少なくとも1方向へ動ける場所にしている
export const TOWN_REENTRY_POS = { x: 22, y: 34 };

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
  // trueだとボス解放に必要な必須の言葉、無ければ（false/省略）ボーナスの言葉。
  // ボス解放の判定はBOSS_UNLOCK_WORD_COUNTの数と単純比較するのではなく、
  // 必須の言葉を何個覚えたかで判定する（ボーナスの言葉を覚えただけでは解放されない）。
  // 「ゆうき」はボスを倒した報酬として後から手に入る言葉なので、これ自体は
  // ボス解放の条件には含めない（含めると「ボスを倒さないと手に入らない言葉が
  // ボスを倒す条件になる」という矛盾が起きるため）
  required?: boolean;
};

export const CHAPTER1_WORD_DICTIONARY: CollectibleWord[] = [
  { kana: "みず", kanji: "水", hint: "村の広場の井戸", required: true },
  { kana: "ひ", kanji: "火", hint: "暖炉のある家", required: true },
  { kana: "かぜ", kanji: "風", hint: "旅人風の村人がいる家", required: true },
  { kana: "ねこ", kanji: "猫", hint: "村を歩き回る猫" },
  { kana: "いぬ", kanji: "犬", hint: "村を歩き回る犬" },
  { kana: "き", kanji: "木", hint: "村の大きな木のそば" },
  { kana: "はな", kanji: "花", hint: "村に咲いている花" },
  { kana: "くさ", kanji: "草", hint: "生い茂った草むら" },
  { kana: "ゆうき", kanji: "勇気", hint: "スライムキングを倒す" },
];

// ボス解放に必要な言葉（kana）の一覧。CHAPTER1_WORD_DICTIONARYから自動で作るので、
// 必須の言葉を増減させたいときはrequiredフラグを直すだけでよい
export const CHAPTER1_REQUIRED_WORDS: string[] = CHAPTER1_WORD_DICTIONARY.filter(
  (word) => word.required
).map((word) => word.kana);
