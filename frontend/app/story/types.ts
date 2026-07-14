// マス目は歩けるか(floor)歩けないか(wall)だけを持つ。
// 井戸・焚き火・出口・ボスなどは別のInteractable配列としてマスに重ねる。
export type TileType = "floor" | "wall";

export type GridMap = {
  tiles: TileType[][]; // tiles[y][x]
  start: { x: number; y: number };
};

// 床の見た目（草・土の道・水面など）。当たり判定（TileType）とは別で、
// 「歩けるかどうか」に関係なく、全マスに何かしらの床画像を敷くために使う。
// sand/stoneはフィールド（世界地図）を新しいタイル素材で作り直すときに追加した
// （chapter1Data.ts FIELD_FLOOR_ROWS参照。村側はgrass/dirt/waterのみ使用）
export type FloorTileType = "grass" | "dirt" | "water" | "sand" | "stone";

export type Interactable = {
  id: string;
  x: number;
  y: number;
  kind: "npc" | "object" | "boss" | "exit";
  // プレースホルダー表示用の絵文字・短いラベル（専用スプライトが無い場合用）
  label: string;
  // 置物の見た目（家・井戸・洞窟など）。指定するとx,yマスの上に画像が表示される
  image?: string;
  // 画像の見た目の大きさ（マス単位）。imageを指定するときは必須
  widthTiles?: number;
  heightTiles?: number;
  // 当たり判定として塞ぐ範囲（マス単位）。省略時はwidthTiles/heightTilesと同じ
  // （画像の見た目全体が壁になる）。屋根のように上のほうは実際には何もない
  // 建物などは、これをwidthTiles/heightTilesより小さくして、下端（足元側）だけを
  // 壁にできる（屋根の裏・向こう側を歩けるようにするため）
  collisionWidthTiles?: number;
  collisionHeightTiles?: number;
  // 会話にぶつかる・当たり判定の穴（床のまま残すマス）の基準点。省略時はx, yと同じ。
  // 家の画像のように見た目の中心とドアの位置がズレている場合、x, yは画像の配置
  // （見た目）用のまま、ここだけドアの実際の位置に合わせて調整できる
  interactionX?: number;
  interactionY?: number;
  teachesWord?: { kana: string; kanji: string };
  // 樽・村人用。ぶつかると「攻撃力の書」「防御力の書」「体力の書」「ポーション」の
  // いずれかを手に入れる（battle/page.tsxの試練の塔にある宝箱アイテムと同じ考え方）。
  // どれも持ち物画面に貯まり、体力の書・ポーションは持ち物画面から使うと効果が出る
  // （攻撃力・防御力の書はボス戦開始時にまとめて自動で効果が乗る）
  grantsItem?: "attack" | "defense" | "hp" | "potion";
  // grantsItem用。一度に何個渡すか（省略時は1個）。長老の家の裏の宝箱のように
  // 「ポーション2個」のようにまとめて渡したいときに使う
  grantsItemCount?: number;
  dialogue?: string[];
  // kind: "exit" 用。ぶつかると別のマップ（シーン）へ切り替える。
  // desertTown/fairyVillageは、それぞれ2章「砂漠の町」・3章「妖精の里」の
  // エリアマップ（chapter2Data.ts/chapter3Data.ts）への入り口
  exitsTo?: "field" | "town" | "desertTown" | "fairyVillage";
};

// 会話や当たり判定を持たない、純粋な見た目だけの置物（木・花・柵・石など）。
// x, yはその置物の「足元」のマス（下端中央がこのマスの下端中央に来るように配置される）。
export type PlacedObject = {
  id: string;
  image: string;
  x: number;
  y: number;
  widthTiles: number;
  heightTiles: number;
  // trueにすると、木や家のような高さのある置物として主人公とYソートするのではなく、
  // 常に主人公より奥（背景）に敷いて表示する。花のような背の低い・地面に貼りつくような
  // 見た目のものに使う（主人公が手前を歩いていても不自然に隠れないようにするため）
  groundLevel?: boolean;
  // trueにすると、chapter1Data.tsの当たり判定の自動生成時にこの置物の見た目の範囲が
  // 障害物（歩けないマス）として扱われる。木・柵・石・花壇のような「ぶつかる」もの用。
  // 花のように踏んでも問題ないものはfalse（省略）にする
  blocksMovement?: boolean;
  // 当たり判定として塞ぐ範囲（マス単位）。省略時はwidthTiles/heightTilesと同じ
  // （見た目全体が壁になる）。footprintOfは常に足元(x, y)を下端に揃えて計算するので、
  // これをheightTilesより小さくすると、見た目の下側（幹など）だけを塞ぎ、上側
  // （木のてっぺん・葉など）は壁にならない。InteractableのcollisionWidthTiles/
  // collisionHeightTilesと同じ考え方
  collisionWidthTiles?: number;
  collisionHeightTiles?: number;
};

// 会話ウィンドウの左右に出す立ち絵1人ぶんのデータ。
// 専用の立ち絵画像がまだ無いキャラクターはemojiで、主人公のように画像がある
// キャラクターはimageで指定する（両方指定した場合はimageを優先する）
export type DialoguePortrait = {
  side: "left" | "right";
  name: string;
  emoji?: string;
  image?: string;
};

// 村をランダムに歩き回るNPC（村人・猫・犬など）の定義。
// x, y（現在位置）は持たず、代わりにspawnX/Yを中心にwanderRadiusの範囲内で
// 自動的に歩き回る。実際の現在位置はuseWanderers.tsが管理する
export type WandererDefinition = {
  id: string;
  spawnX: number;
  spawnY: number;
  // spawnX, spawnYからこのマス数より遠くへは歩いていかない
  wanderRadius: number;
  kind: "npc";
  // 専用のマップ用スプライト画像が無い場合のフォールバック表示（絵文字）。
  // 会話ウィンドウの立ち絵が無い村人の代役emojiとしても使われるので、
  // 下のimageを指定した場合でもlabelは残しておいてよい（GridExplorer側は
  // imageがあればそちらを優先し、labelの絵文字は表示しない）
  label: string;
  image?: string;
  widthTiles?: number;
  heightTiles?: number;
  teachesWord?: { kana: string; kanji: string };
  // ポーションなどを一度だけくれる歩き回るNPC用（樽と同じ仕組みをそのまま流用できる）
  grantsItem?: "attack" | "defense" | "hp" | "potion";
  dialogue: string[];
};
