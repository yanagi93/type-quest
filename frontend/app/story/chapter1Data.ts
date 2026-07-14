import type { FloorTileType, GridMap, Interactable, PlacedObject, WandererDefinition } from "./types";
import { parseWallRows } from "./mapGen";

// 第1章「はじまりの村」で使うマップ・インタラクタブルのデータ。

// ============================================================
// 当たり判定（村マップ）の仕組み
// ============================================================
// 以前は「家・木・柵・石・花壇の位置と大きさから当たり判定を自動計算する」方式
// （buildTownTiles）だったが、村のマップ自体をマップエディタ（/story/map-editor）で
// 作り直したのに合わせて、当たり判定もエディタで直接描いたASCII（TOWN_WALL_ROWS）を
// そのまま使う方式に変更した。エディタ側で、家のドアの位置だけ床のまま残す描き方を
// しているので、扉のマス（interactionX/Y）は今もTOWN_WALL_ROWS側の「床の隙間」と
// 一致させてある（parseWallRowsで変換するだけで、家の周りの壁も扉もそのまま反映される）。
//
// 中央広場の木4本（「き」を覚える場所）だけは、エディタの置物レイヤーには置いたが
// 壁レイヤーには描いていないため、木の幹の位置だけ床を残して周りを壁にする処理を
// 下のbuildTownTilesで追加している（家のドアと同じ考え方）。
//
// マス目は48列 x 45行。ゲーム中に g キーを押すと、実際にどのマスが壁になって
// いるか（赤）を背景に重ねて確認できる。
// ============================================================

export const TOWN_TILE_SIZE = 48;
const TOWN_GRID_WIDTH = 48;
const TOWN_GRID_HEIGHT = 45;

// ボスに挑めるようになる条件（覚えた単語の数）。村の門のセリフでも使うので、
// 先に定義しておく。
//
// 以前は「みず・ひ・かぜ」の3つだけを「必須の言葉」として数えていたが、
// 「別の言葉でもいいことにしたい（ねこ・いぬ等でもOK）」という要望を受けて、
// 「はな」以外の覚えた言葉を何個持っているか、という数え方に変更した
// （はなは最初に必ず手に入る言葉なので、これ自体はノーカウントにして、
// 「はなを覚えたら、そこからさらに3つ集めよう」という導線にしている）。
// 実際の数え方はStoryGame.tsxのcountRequiredWordsLearnedを参照。
export const BOSS_UNLOCK_WORD_COUNT = 3;

// 花以外は数えない、という判定に使う（StoryGame.tsx側と両方から参照する）
export const WORD_EXCLUDED_FROM_COUNT = "はな";

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
      "長老の家だ。机の上に、言霊についての古い本が何冊も積まれている。",
      "手に取ってみると……『言霊の書』以外は、どれも白紙だった。",
      "コト「文字が消えちゃってる……言葉の力が失われたせいなのかな。」",
      "コト「この『言霊の書』だけが、唯一残っているんだね。」",
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
    y: 23,
    kind: "npc",
    label: "",
    image: "/images/map/okimono/ie.png",
    widthTiles: 6,
    heightTiles: 6,
    collisionWidthTiles: 6,
    collisionHeightTiles: 3,
    interactionX: 6,
    interactionY: 23,
    teachesWord: { kana: "かぜ", kanji: "風" },
    dialogue: [
      "旅人風の村人が窓辺に立って、外を見つめている。",
      "コト「気持ちよさそうな風……これは『かぜ』っていう言霊だよ！」",
    ],
  },
  {
    id: "house-inn",
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
    dialogue: ["宿屋のようだ。今はまだ誰もいない。", "コト「泊まれるようになるのは、もう少し先みたいだね。」"],
  },
  // 武器屋ではなく雑貨屋にした（装備は防具だけを扱う想定。武器はここでは売らない）。
  // 中身（実際に買い物ができる機能）はまだ実装していないので、1章の他の店と同じく
  // 「まだ開いていない」トーンの地の文にとどめている
  {
    id: "house-zakka-ya",
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
    dialogue: [
      "雑貨屋のようだ。防具だけを扱っているらしい。",
      "コト「武器はここでは売ってないんだね。防具は買えるようになるかも？」",
    ],
  },
  // 誰もいない家3軒は、以前は「住人は村のどこかを歩き回っているらしい」という
  // 説明だったが、鍵がかかっていて中に入れない、という自然な理由に変更した
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
    dialogue: ["鍵のかかった家だ。中には入れないようだ。"],
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
    dialogue: ["鍵のかかった家だ。中には入れないようだ。"],
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
    dialogue: ["鍵のかかった家だ。中には入れないようだ。"],
  },
  // 池。以前は「小さな魚が泳いでいる」という一文があったが、まだ「さかな」という
  // 言葉を手に入れる手段が無いので、今は水面があるだけの説明にとどめている。
  // 「さかな」の言葉を実装したら、ここに魚が住み着いている描写を足すこと
  {
    id: "pond",
    x: 5,
    y: 8,
    kind: "object",
    label: "",
    dialogue: ["澄んだ池だ。水面が静かに揺れている。"],
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
    dialogue: [
      "紫色の岩でできた、不気味な洞窟の入り口だ。",
      "中は暗すぎて、とても入っていけそうにない。",
      "岩の隙間から、禍々しい力が漏れ出しているのが分かる。",
      "コト「待って！　今の私たちじゃ、まだこの力には勝てない。」",
      "コト「もっと言葉を集めて、力をつけてから来よう。」",
    ],
  },
  // 洞窟の入り口は2マス分あるが、以前は右側（41,8）でしか会話が起きなかった。
  // 左側（42,8）でも同じ会話ができるよう、見た目を持たない透明なぶつかり判定として追加した
  {
    id: "cave-left",
    x: 42,
    y: 8,
    kind: "object",
    label: "",
    dialogue: [
      "紫色の岩でできた、不気味な洞窟の入り口だ。",
      "中は暗すぎて、とても入っていけそうにない。",
      "岩の隙間から、禍々しい力が漏れ出しているのが分かる。",
      "コト「待って！　今の私たちじゃ、まだこの力には勝てない。」",
      "コト「もっと言葉を集めて、力をつけてから来よう。」",
    ],
  },
  // 村の門。以前は1か所だけだったが、「出られない場所ができないように」横一列3か所に
  // 増やした（22,23,24の3マス、いずれも草原へ出る）
  {
    id: "town-exit-1",
    x: 22,
    y: 42,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["村の門をくぐり、草原の外へ出た。"],
  },
  {
    id: "town-exit-2",
    x: 23,
    y: 42,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["村の門をくぐり、草原の外へ出た。"],
  },
  {
    id: "town-exit-3",
    x: 24,
    y: 42,
    kind: "exit",
    label: "",
    exitsTo: "field",
    dialogue: ["村の門をくぐり、草原の外へ出た。"],
  },
  // 謎の青年。以前は木の裏に隠れて見えにくい位置にいたので、開けた場所へ移動した。
  // 会話の最後に、コトが「なぜこの人だけ普通に喋れるんだろう」と不思議がる一言を追加した
  // （この世界の村人は「う、う……」としか喋れないという設定と対比させる伏線）
  {
    id: "stranger",
    x: 25,
    y: 38,
    kind: "npc",
    label: "👤",
    image: "/images/map/mura/nazosyounennumei.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: [
      "旅人風の青年が、静かにこちらを見ている。",
      "青年「旅は楽しい？」",
      "青年「焦らなくていい。君なら大丈夫。」",
      "コト「あれ、あの人……なんでちゃんと喋れているんだろう……？」",
    ],
  },
  // すごく眠そうな村人。目の下に濃いクマができている。
  // 2章で「ねる」という言葉を覚えると、この人の様子が変化する予定（今はまだ未実装）
  {
    id: "sleepy-villager",
    x: 25,
    y: 23,
    kind: "npc",
    label: "🧑",
    image: "/images/map/mura/murabito2.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: [
      "村人が、目の下に濃いクマを作ってふらふらと立っている。",
      "村人「……ふわぁ……（ぜんぜん眠れていないみたいだ）」",
    ],
  },
  // 樽。中身に「攻撃力の書」「防御力の書」「体力の書」のどれが入っているかを
  // grantsItemで指定する。今回、樽の数を10個に増やしたのに合わせて、
  // 全部に何か入っているわけではなく、空っぽの樽も混ぜてある
  // （空っぽの樽はgrantsItemを指定せず、地の文だけで完結させている）
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
    x: 27,
    y: 13,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "hp",
    dialogue: ["家のそばに、しっかりした樽が置いてある。", "コト「開けてみるね……」"],
  },
  {
    id: "barrel-3",
    x: 15,
    y: 32,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "defense",
    dialogue: ["家の裏に、苔むした樽が置いてある。", "コト「開けてみるね……」"],
  },
  {
    id: "barrel-empty-1",
    x: 15,
    y: 15,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-2",
    x: 27,
    y: 12,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-3",
    x: 30,
    y: 22,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-4",
    x: 30,
    y: 23,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-5",
    x: 30,
    y: 24,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-6",
    x: 31,
    y: 33,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  {
    id: "barrel-empty-7",
    x: 9,
    y: 33,
    kind: "object",
    label: "",
    image: "/images/map/okimono/taru.png",
    widthTiles: 1,
    heightTiles: 1,
    dialogue: ["古い樽が置いてある。", "コト「開けてみるね……」", "コト「あ、空っぽだ。」"],
  },
  // 長老の家の裏の宝箱。ポーション2個をまとめて手に入れられる
  // （grantsItemCount参照）。中に小銭も入っている描写だけは入れてあるが、
  // 通貨（ゴールド）自体はまだ実装していないので、実際には何も加算されない
  // （2章でショップ・通貨システムを実装するときに、ここも実際に使えるお金にする）。
  // 座標はTOWN_OBJECTSの宝箱の見た目（旧chest-279、置物としては重複するので
  // そちらは削除した）と同じ位置に合わせてある
  {
    id: "elder-treasure",
    x: 23,
    y: 3,
    kind: "object",
    label: "",
    image: "/images/map/okimono/takarabako.png",
    widthTiles: 1,
    heightTiles: 1,
    grantsItem: "potion",
    grantsItemCount: 2,
    dialogue: [
      "長老の家の裏に、古びた宝箱を見つけた。",
      "コト「中に小銭も入ってるね。今はまだ使い道が無さそうだけど……」",
      "コト「開けてみるね……」",
    ],
  },
  // 花壇。コトに出会った直後、最初に案内される場所（TUTORIAL_START_POS参照）で、
  // 「言葉集め」の基本操作をここで説明する役目も持たせている。
  // 「はな」を覚えた後、村を出るには『はな』以外の言葉があと3つ必要、という
  // 新しいルールの説明も付け加えた
  {
    id: "flowerbed-elder",
    x: 27,
    y: 6,
    kind: "object",
    label: "",
    image: "/images/map/okimono/kadan.png",
    widthTiles: 3,
    heightTiles: 2,
    teachesWord: { kana: "はな", kanji: "花" },
    dialogue: [
      "長老の家のそばに、色とりどりの花壇がある。",
      "コト「きれいな花……これは『はな』っていう言霊だよ！」",
      "コト「これが『言葉集め』の基本だよ。物に近づいてぶつかると、思い出せる言葉が見つかるんだ。」",
      "コト「同じように、いろんな物に触れて言葉を探してみてね！」",
      "コト「『はな』のほかにも、あと3つくらい言葉を集めてみよう！」",
    ],
  },
  // 中央広場の木4本。どれか1本に触れると「き」を覚える。会話イベントの後は、
  // 木の幹の位置がそのまま「ぶつかると同じ会話を繰り返すだけの壁」になる
  // （家のドアと同じ、床を1マスだけ残して周りを壁にする仕組み。実際の壁化は
  // buildTownTiles側で行っている）。dialogue自体は毎回同じ文章でよく、
  // 初めて触れたときだけ自動で「『木（き）』をおぼえた！」の1行が追加される
  {
    id: "plaza-tree-1",
    x: 19,
    y: 20,
    kind: "object",
    label: "",
    teachesWord: { kana: "き", kanji: "木" },
    dialogue: ["大きな木に触れた。", "コト「木だね！」"],
  },
  {
    id: "plaza-tree-2",
    x: 27,
    y: 20,
    kind: "object",
    label: "",
    teachesWord: { kana: "き", kanji: "木" },
    dialogue: ["大きな木に触れた。", "コト「木だね！」"],
  },
  {
    id: "plaza-tree-3",
    x: 19,
    y: 27,
    kind: "object",
    label: "",
    teachesWord: { kana: "き", kanji: "木" },
    dialogue: ["大きな木に触れた。", "コト「木だね！」"],
  },
  {
    id: "plaza-tree-4",
    x: 27,
    y: 27,
    kind: "object",
    label: "",
    teachesWord: { kana: "き", kanji: "木" },
    dialogue: ["大きな木に触れた。", "コト「木だね！」"],
  },
  // 右上の石の山（TOWN_OBJECTSのstone-301〜320）。以前は当たり判定が無く
  // 素通りできてしまっていたのを、applyStonePileCollisionで壁にした
  // （STONE_PILE_INTERACTION_POINT参照）。「いし」を覚えつつ、将来
  // 「石を砕くとお金が出る」ギミック（TOWN_OBJECTS冒頭のコメント参照）の伏線となる
  // 一言を添えてある
  {
    id: "stone-pile",
    x: 33, // STONE_PILE_INTERACTION_POINTと同じ座標（定義順の都合でここでは直接数値を書いている）
    y: 5,
    kind: "object",
    label: "",
    teachesWord: { kana: "いし", kanji: "石" },
    dialogue: [
      "大きな石がいくつも積み重なっている。",
      "コト「これは『いし』っていう言霊だね！」",
      "コト「叩いてみると、何か壊せそうな手応えがあるよ……」",
    ],
  },
];

// ============================================================
// 村を歩き回るNPC（村人・猫・犬）の置き方 ガイド
// ============================================================
// TOWN_INTERACTABLESと違って、こちらは決まった位置に留まらず、
// spawnX, spawnYを中心にwanderRadiusマス以内をランダムに歩き回る
// （実際の移動処理はuseWanderers.ts）。話しかける（ぶつかる）と
// dialogueが表示されるのはTOWN_INTERACTABLESと同じ。
//
// マップを作り直した後も、全員の出発位置（spawnX/Y）は新しいマップ上で
// 歩ける場所であることを確認済みなので、変更していない。
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
// 見た目だけの置物（木・花・柵・石など）
// ============================================================
// 以前はscatterObjectsヘルパーで座標リストから量産していたが、マップエディタ
// （/story/map-editor）で村を作り直したのに合わせて、エディタが書き出した
// PlacedObject[]をそのまま貼り付ける方式に変えた（家・木・柵・石・花壇など
// 全種類が混在した1つの配列になっている）。
//
// 右上（x35付近、y3〜7）に岩がまとまって置いてある場所があるのは意図的な配置。
// 将来「岩を砕けるようになる」ギミックを実装したとき、砕くとお金がたまに出る
// スポットにする予定（今はまだただの飾り）
export const TOWN_OBJECTS: PlacedObject[] = [
  { id: "tree-3", image: "/images/map/okimono/tree2.png", x: 0, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-5", image: "/images/map/okimono/tree2.png", x: 0, y: 4, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-6", image: "/images/map/okimono/tree2.png", x: 0, y: 6, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-7", image: "/images/map/okimono/tree2.png", x: 0, y: 8, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-8", image: "/images/map/okimono/tree2.png", x: 0, y: 10, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-9", image: "/images/map/okimono/tree2.png", x: 0, y: 12, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-10", image: "/images/map/okimono/tree2.png", x: 0, y: 14, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-11", image: "/images/map/okimono/tree2.png", x: 0, y: 16, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-12", image: "/images/map/okimono/tree2.png", x: 0, y: 18, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-13", image: "/images/map/okimono/tree2.png", x: 0, y: 20, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-14", image: "/images/map/okimono/tree2.png", x: 0, y: 22, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-15", image: "/images/map/okimono/tree2.png", x: 0, y: 24, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-16", image: "/images/map/okimono/tree2.png", x: 0, y: 26, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-17", image: "/images/map/okimono/tree2.png", x: 0, y: 28, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-18", image: "/images/map/okimono/tree2.png", x: 0, y: 30, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-19", image: "/images/map/okimono/tree2.png", x: 0, y: 32, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-20", image: "/images/map/okimono/tree2.png", x: 0, y: 34, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-21", image: "/images/map/okimono/tree2.png", x: 0, y: 36, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-22", image: "/images/map/okimono/tree2.png", x: 0, y: 38, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-63", image: "/images/map/okimono/tree2.png", x: 0, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-64", image: "/images/map/okimono/tree2.png", x: 2, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-66", image: "/images/map/okimono/tree2.png", x: 4, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-67", image: "/images/map/okimono/tree2.png", x: 0, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-68", image: "/images/map/okimono/tree2.png", x: 2, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-69", image: "/images/map/okimono/tree2.png", x: 4, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-70", image: "/images/map/okimono/tree2.png", x: 0, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-71", image: "/images/map/okimono/tree2.png", x: 2, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-72", image: "/images/map/okimono/tree2.png", x: 4, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-73", image: "/images/map/okimono/tree2.png", x: 6, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-74", image: "/images/map/okimono/tree2.png", x: 8, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-75", image: "/images/map/okimono/tree2.png", x: 10, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-81", image: "/images/map/okimono/tree2.png", x: 6, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-82", image: "/images/map/okimono/tree2.png", x: 8, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-83", image: "/images/map/okimono/tree2.png", x: 10, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-89", image: "/images/map/okimono/tree2.png", x: 6, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-90", image: "/images/map/okimono/tree2.png", x: 8, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-91", image: "/images/map/okimono/tree2.png", x: 10, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-98", image: "/images/map/okimono/tree2.png", x: 26, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-99", image: "/images/map/okimono/tree2.png", x: 28, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-100", image: "/images/map/okimono/tree2.png", x: 30, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-101", image: "/images/map/okimono/tree2.png", x: 32, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-102", image: "/images/map/okimono/tree2.png", x: 34, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-103", image: "/images/map/okimono/tree2.png", x: 36, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-104", image: "/images/map/okimono/tree2.png", x: 38, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-105", image: "/images/map/okimono/tree2.png", x: 40, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-106", image: "/images/map/okimono/tree2.png", x: 42, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-107", image: "/images/map/okimono/tree2.png", x: 44, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-109", image: "/images/map/okimono/tree2.png", x: 2, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-110", image: "/images/map/okimono/tree2.png", x: 4, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-111", image: "/images/map/okimono/tree2.png", x: 6, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-112", image: "/images/map/okimono/tree2.png", x: 8, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-113", image: "/images/map/okimono/tree2.png", x: 10, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-114", image: "/images/map/okimono/tree2.png", x: 12, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-115", image: "/images/map/okimono/tree2.png", x: 14, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-116", image: "/images/map/okimono/tree2.png", x: 16, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-117", image: "/images/map/okimono/tree2.png", x: 18, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-118", image: "/images/map/okimono/tree2.png", x: 20, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-119", image: "/images/map/okimono/tree2.png", x: 22, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-120", image: "/images/map/okimono/tree2.png", x: 24, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-121", image: "/images/map/okimono/tree2.png", x: 26, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-122", image: "/images/map/okimono/tree2.png", x: 28, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-123", image: "/images/map/okimono/tree2.png", x: 30, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-124", image: "/images/map/okimono/tree2.png", x: 32, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-125", image: "/images/map/okimono/tree2.png", x: 34, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-126", image: "/images/map/okimono/tree2.png", x: 36, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-127", image: "/images/map/okimono/tree2.png", x: 38, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-128", image: "/images/map/okimono/tree2.png", x: 40, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-129", image: "/images/map/okimono/tree2.png", x: 42, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-130", image: "/images/map/okimono/tree2.png", x: 44, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-131", image: "/images/map/okimono/tree2.png", x: 46, y: 2, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-132", image: "/images/map/okimono/tree2.png", x: 46, y: 4, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-133", image: "/images/map/okimono/tree2.png", x: 46, y: 6, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-134", image: "/images/map/okimono/tree2.png", x: 46, y: 8, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-152", image: "/images/map/okimono/tree2.png", x: 44, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-153", image: "/images/map/okimono/tree2.png", x: 42, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-154", image: "/images/map/okimono/tree2.png", x: 40, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-156", image: "/images/map/okimono/tree2.png", x: 38, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-157", image: "/images/map/okimono/tree2.png", x: 36, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-158", image: "/images/map/okimono/tree2.png", x: 34, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-159", image: "/images/map/okimono/tree2.png", x: 32, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-160", image: "/images/map/okimono/tree2.png", x: 30, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-161", image: "/images/map/okimono/tree2.png", x: 28, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-162", image: "/images/map/okimono/tree2.png", x: 26, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-163", image: "/images/map/okimono/tree2.png", x: 26, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-164", image: "/images/map/okimono/tree2.png", x: 28, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-165", image: "/images/map/okimono/tree2.png", x: 30, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-166", image: "/images/map/okimono/tree2.png", x: 32, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-167", image: "/images/map/okimono/tree2.png", x: 34, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-168", image: "/images/map/okimono/tree2.png", x: 36, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-169", image: "/images/map/okimono/tree2.png", x: 38, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-170", image: "/images/map/okimono/tree2.png", x: 40, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-171", image: "/images/map/okimono/tree2.png", x: 42, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-172", image: "/images/map/okimono/tree2.png", x: 44, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-199", image: "/images/map/okimono/tree2.png", x: 37, y: 3, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-200", image: "/images/map/okimono/tree2.png", x: 36, y: 4, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "barrel-201-deco", image: "/images/map/okimono/taru.png", x: 23, y: 8, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-202-deco", image: "/images/map/okimono/taru.png", x: 15, y: 15, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-203-deco", image: "/images/map/okimono/taru.png", x: 27, y: 12, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-204-deco", image: "/images/map/okimono/taru.png", x: 27, y: 13, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-205-deco", image: "/images/map/okimono/taru.png", x: 30, y: 22, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-206-deco", image: "/images/map/okimono/taru.png", x: 30, y: 23, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-207-deco", image: "/images/map/okimono/taru.png", x: 30, y: 24, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "house-213-deco", image: "/images/map/okimono/ie.png", x: 7, y: 23, widthTiles: 6, heightTiles: 6, blocksMovement: true, collisionHeightTiles: 3 },
  { id: "barrel-214-deco", image: "/images/map/okimono/taru.png", x: 31, y: 33, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-218-deco", image: "/images/map/okimono/taru.png", x: 15, y: 32, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "barrel-221-deco", image: "/images/map/okimono/taru.png", x: 9, y: 33, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "flowerbed-223", image: "/images/map/okimono/kadan.png", x: 27, y: 6, widthTiles: 3, heightTiles: 2, blocksMovement: true },
  { id: "fence-229", image: "/images/map/okimono/saku.png", x: 24, y: 39, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "fence-230", image: "/images/map/okimono/saku.png", x: 22, y: 39, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "flower-233", image: "/images/map/okimono/hana.png", x: 8, y: 6, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-234", image: "/images/map/okimono/hana.png", x: 3, y: 6, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "tree-239", image: "/images/map/okimono/tree2.png", x: 46, y: 10, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-241", image: "/images/map/okimono/tree2.png", x: 46, y: 12, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-242", image: "/images/map/okimono/tree2.png", x: 46, y: 14, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-243", image: "/images/map/okimono/tree2.png", x: 46, y: 16, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-244", image: "/images/map/okimono/tree2.png", x: 46, y: 18, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-246", image: "/images/map/okimono/tree2.png", x: 46, y: 20, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-247", image: "/images/map/okimono/tree2.png", x: 46, y: 22, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-248", image: "/images/map/okimono/tree2.png", x: 46, y: 24, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-249", image: "/images/map/okimono/tree2.png", x: 46, y: 26, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-250", image: "/images/map/okimono/tree2.png", x: 46, y: 28, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-251", image: "/images/map/okimono/tree2.png", x: 46, y: 30, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-252", image: "/images/map/okimono/tree2.png", x: 46, y: 32, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-253", image: "/images/map/okimono/tree2.png", x: 46, y: 34, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-254", image: "/images/map/okimono/tree2.png", x: 46, y: 36, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-255", image: "/images/map/okimono/tree2.png", x: 46, y: 38, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-257", image: "/images/map/okimono/tree2.png", x: 46, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-258", image: "/images/map/okimono/tree2.png", x: 46, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-260", image: "/images/map/okimono/tree2.png", x: 46, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "fence-261", image: "/images/map/okimono/saku.png", x: 5, y: 32, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "fence-262", image: "/images/map/okimono/saku.png", x: 4, y: 32, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "fence-263", image: "/images/map/okimono/saku.png", x: 3, y: 32, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "fence-264", image: "/images/map/okimono/saku.png", x: 2, y: 32, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "tree-268-deco", image: "/images/map/okimono/tree2.png", x: 19, y: 27, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-269-deco", image: "/images/map/okimono/tree2.png", x: 27, y: 27, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-270-deco", image: "/images/map/okimono/tree2.png", x: 27, y: 20, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "house-281-deco", image: "/images/map/okimono/ie.png", x: 22, y: 7, widthTiles: 6, heightTiles: 6, blocksMovement: true, collisionHeightTiles: 3 },
  { id: "flower-282", image: "/images/map/okimono/hana.png", x: 17, y: 7, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-283", image: "/images/map/okimono/hana.png", x: 20, y: 13, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-284", image: "/images/map/okimono/hana.png", x: 6, y: 16, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-285", image: "/images/map/okimono/hana.png", x: 37, y: 16, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-286", image: "/images/map/okimono/hana.png", x: 42, y: 21, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-287", image: "/images/map/okimono/hana.png", x: 28, y: 31, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-288", image: "/images/map/okimono/hana.png", x: 13, y: 29, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-289", image: "/images/map/okimono/hana.png", x: 4, y: 30, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-290", image: "/images/map/okimono/hana.png", x: 42, y: 34, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "flower-293", image: "/images/map/okimono/hana.png", x: 12, y: 38, widthTiles: 2, heightTiles: 2, groundLevel: true },
  { id: "tree-294", image: "/images/map/okimono/tree2.png", x: 12, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-296", image: "/images/map/okimono/tree2.png", x: 12, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-297", image: "/images/map/okimono/tree2.png", x: 12, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "fence-298", image: "/images/map/okimono/saku.png", x: 21, y: 20, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "tree-300-deco", image: "/images/map/okimono/tree2.png", x: 19, y: 20, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "stone-301", image: "/images/map/okimono/isi.png", x: 37, y: 6, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-303", image: "/images/map/okimono/isi.png", x: 36, y: 6, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-304", image: "/images/map/okimono/isi.png", x: 37, y: 5, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-305", image: "/images/map/okimono/isi.png", x: 36, y: 5, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-306", image: "/images/map/okimono/isi.png", x: 35, y: 5, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-307", image: "/images/map/okimono/isi.png", x: 35, y: 6, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-308", image: "/images/map/okimono/isi.png", x: 37, y: 7, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-309", image: "/images/map/okimono/isi.png", x: 36, y: 7, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-310", image: "/images/map/okimono/isi.png", x: 35, y: 7, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-311", image: "/images/map/okimono/isi.png", x: 34, y: 3, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-312", image: "/images/map/okimono/isi.png", x: 34, y: 4, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-313", image: "/images/map/okimono/isi.png", x: 34, y: 5, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-314", image: "/images/map/okimono/isi.png", x: 34, y: 6, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-315", image: "/images/map/okimono/isi.png", x: 34, y: 7, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-316", image: "/images/map/okimono/isi.png", x: 33, y: 7, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-317", image: "/images/map/okimono/isi.png", x: 33, y: 6, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-318", image: "/images/map/okimono/isi.png", x: 33, y: 5, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-319", image: "/images/map/okimono/isi.png", x: 33, y: 4, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "stone-320", image: "/images/map/okimono/isi.png", x: 33, y: 3, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "tree-321", image: "/images/map/okimono/tree2.png", x: 14, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-322", image: "/images/map/okimono/tree2.png", x: 14, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-323", image: "/images/map/okimono/tree2.png", x: 14, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-326", image: "/images/map/okimono/tree2.png", x: 16, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-327", image: "/images/map/okimono/tree2.png", x: 16, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-328", image: "/images/map/okimono/tree2.png", x: 16, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-329", image: "/images/map/okimono/tree2.png", x: 18, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-330", image: "/images/map/okimono/tree2.png", x: 18, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-331", image: "/images/map/okimono/tree2.png", x: 18, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-332", image: "/images/map/okimono/tree2.png", x: 20, y: 40, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-333", image: "/images/map/okimono/tree2.png", x: 20, y: 42, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-334", image: "/images/map/okimono/tree2.png", x: 20, y: 44, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-335", image: "/images/map/okimono/tree2.png", x: 40, y: 15, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-336", image: "/images/map/okimono/tree2.png", x: 37, y: 19, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-338", image: "/images/map/okimono/tree2.png", x: 33, y: 16, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-339", image: "/images/map/okimono/tree2.png", x: 43, y: 26, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "tree-341", image: "/images/map/okimono/tree2.png", x: 3, y: 13, widthTiles: 3, heightTiles: 3, blocksMovement: true, collisionHeightTiles: 2 },
  { id: "fence-342", image: "/images/map/okimono/saku.png", x: 34, y: 13, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "fence-343", image: "/images/map/okimono/saku.png", x: 33, y: 13, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "house-344-deco", image: "/images/map/okimono/ie.png", x: 30, y: 13, widthTiles: 6, heightTiles: 6, blocksMovement: true, collisionHeightTiles: 3 },
  { id: "fence-345", image: "/images/map/okimono/saku.png", x: 11, y: 14, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "flowerbed-346", image: "/images/map/okimono/kadan.png", x: 9, y: 14, widthTiles: 3, heightTiles: 2, blocksMovement: true },
];

// 置物の見た目の範囲（マス目の矩形）を計算する。x, yは足元のマスなので、
// 下端中央がそのマスの下端中央に来るように逆算する（GridExplorer.tsxの描画と同じ式）
function footprintOf(x: number, y: number, widthTiles: number, heightTiles: number) {
  const left = Math.round(x + 0.5 - widthTiles / 2);
  const top = Math.round(y + 1 - heightTiles);
  return { left, right: left + widthTiles, top, bottom: top + heightTiles };
}

// 中央広場の木4本（TOWN_INTERACTABLESのplaza-tree-1〜4）の当たり判定を追加する。
// 見た目は3x2（collisionHeightTiles:2）だが、幹の位置（x, y。＝インタラクタブルの
// interactionポイント）だけは床のまま残し、周りだけ壁にする（家のドアと同じ仕組み）。
// TOWN_OBJECTS側の対応する木（tree-268-deco等）と同じ座標・大きさを使っている
const PLAZA_TREE_ANCHORS: [number, number][] = [
  [19, 20],
  [27, 20],
  [19, 27],
  [27, 27],
];

function applyPlazaTreeCollision(tiles: GridMap["tiles"]) {
  for (const [x, y] of PLAZA_TREE_ANCHORS) {
    const fp = footprintOf(x, y, 3, 2);

    for (let yy = fp.top; yy < fp.bottom; yy++) {
      for (let xx = fp.left; xx < fp.right; xx++) {
        if (xx === x && yy === y) continue; // 幹の位置だけは床のまま残す
        if (yy < 0 || yy >= tiles.length || xx < 0 || xx >= tiles[0].length) continue;

        tiles[yy][xx] = "wall";
      }
    }
  }
}

// 右上の石の山（TOWN_OBJECTSのstone-301〜320）。以前は見た目だけで当たり判定が
// 無く、石の上を素通りできてしまっていた。石が積まれている範囲を丸ごと壁にし、
// (33,5)だけ床のまま残して「いし」を覚える会話のぶつかり判定にする
// （西側の開けた場所からしか近づけない配置なので、そちら側の1マスを残してある）
const STONE_PILE_POSITIONS: [number, number][] = [
  [37, 6], [36, 6], [37, 5], [36, 5], [35, 5], [35, 6], [37, 7], [36, 7], [35, 7],
  [34, 3], [34, 4], [34, 5], [34, 6], [34, 7], [33, 7], [33, 6], [33, 5], [33, 4], [33, 3],
];
const STONE_PILE_INTERACTION_POINT: [number, number] = [33, 5];

function applyStonePileCollision(tiles: GridMap["tiles"]) {
  for (const [x, y] of STONE_PILE_POSITIONS) {
    if (x === STONE_PILE_INTERACTION_POINT[0] && y === STONE_PILE_INTERACTION_POINT[1]) continue;
    if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) continue;

    tiles[y][x] = "wall";
  }
}

// ============================================================
// 当たり判定（マップエディタで描いたASCII）
// ============================================================
// マップエディタ（/story/map-editor）で「壁の筆」を使って直接描いたもの。
// '#' が壁、'.' が床（歩ける）。家のドアの位置には、エディタ上であらかじめ
// 床の隙間を1マス残して描いてある（TOWN_INTERACTABLESのinteractionX/Yと対応）。
//
//              0         1         2         3         4
//              0123456789012345678901234567890123456789012345678
const TOWN_WALL_ROWS: string[] = [
  "################################################",
  "################################################",
  "################################################",
  "##................................##############",
  "##................................##############",
  "##..................#########.....##############",
  "##.#####............#######.#.....##############",
  "##.#####............#.####............##########",
  "##.##.##..............................###..#####",
  "##...........................................###",
  "##...........................................###",
  "##..........................######...........###",
  "#####.......######..........######...........###",
  "#####...###.######..........#.####...........###",
  "##......#####.####.....................###...###",
  "##..............................###....###...###",
  "##..............................###..........###",
  "##...........................................###",
  "##..................................###......###",
  "##..................................###......###",
  "##...................#.......................###",
  "##...######..................................###",
  "##...######....................######........###",
  "##...#.####...........###......######........###",
  "##....................#.#......#.####........###",
  "##........................................######",
  "##........................................######",
  "##...........................................###",
  "##...........................................###",
  "##...........................................###",
  "##....######....######.......................###",
  "##....######....######..........######.......###",
  "#######.####....#.####..........######.......###",
  "##..............................#.####.......###",
  "##...........................................###",
  "##...........................................###",
  "##...........................................###",
  "##...........................................###",
  "##...........................................###",
  "#######################.########################",
  "######################...#######################",
  "######################...#######################",
  "######################...#######################",
  "################################################",
  "################################################",
];

function buildTownTiles(): GridMap["tiles"] {
  const tiles = parseWallRows(TOWN_WALL_ROWS, TOWN_GRID_HEIGHT, TOWN_GRID_WIDTH, "TOWN_WALL_ROWS");

  applyPlazaTreeCollision(tiles);
  applyStonePileCollision(tiles);

  return tiles;
}

// ============================================================
// 床の見た目（草・土の道・水面）
// ============================================================
// マップエディタで「床の筆」を使って描いたもの。1文字が1マスに対応していて、
// 見たままの形がゲーム内の道の形になる。
//
// 使える文字（他の文字を使うと開発時にエラーで教えてくれる）:
//   .  草地
//   #  土の道
//   ~  水面
//
// 1行が48文字（TOWN_GRID_WIDTH）、45行（TOWN_GRID_HEIGHT）ちょうどである必要がある。
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
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................########..................",
  ".............#################..................",
  ".............############.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "....................#######.....................",
  "....................#######.....................",
  "....................#######.....................",
  "......#####################.....................",
  "......###############################...........",
  "....................##################..........",
  "......................###...........###.........",
  "......................###............###........",
  "......................###.............##........",
  "......................###.............##........",
  "......................###.............##........",
  "......................###.............##........",
  ".......##################............###........",
  ".......################################.........",
  "......................################..........",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
  "......................###.......................",
];

const FLOOR_CHAR_MAP: Record<string, FloorTileType> = {
  ".": "grass",
  "#": "dirt",
  "~": "water",
  "s": "sand",
  "o": "stone",
};

function parseFloorRows(rows: string[], expectedHeight: number, expectedWidth: number, label: string): FloorTileType[][] {
  if (rows.length !== expectedHeight) {
    throw new Error(`${label}は${expectedHeight}行である必要があります（実際: ${rows.length}行）`);
  }

  return rows.map((row, y) => {
    if (row.length !== expectedWidth) {
      throw new Error(`${label}の${y}行目は${expectedWidth}文字である必要があります（実際: ${row.length}文字）`);
    }

    return row.split("").map((char, x) => {
      const tile = FLOOR_CHAR_MAP[char];

      if (!tile) {
        throw new Error(`${label}の(${x}, ${y})に不明な文字「${char}」があります。使えるのは ".", "#", "~", "s", "o" のみです`);
      }

      return tile;
    });
  });
}

export const TOWN_FLOOR_TEXTURES: FloorTileType[][] = parseFloorRows(
  TOWN_FLOOR_ROWS,
  TOWN_GRID_HEIGHT,
  TOWN_GRID_WIDTH,
  "TOWN_FLOOR_ROWS"
);

// 開始位置は井戸の広場のすぐ南（井戸自体は3x3の当たり判定を持つのでそこは避けている）
export const TOWN_MAP: GridMap = {
  tiles: buildTownTiles(),
  start: { x: 24, y: 26 },
};

// フィールドから村へ戻ったときに立つ位置。
// 左右が壁・上下がインタラクタブルの行き止まりを避け、少なくとも1方向へ動ける場所にしている
export const TOWN_REENTRY_POS = { x: 22, y: 34 };

// コトに出会った直後（meetKoto終了後）だけ使う開始位置。第1章はコトの誘導で
// 進むチュートリアルに近い体験にしたいので、通常の開始位置（井戸の近く）ではなく、
// 最初に案内する花壇（flowerbed-elder、はなの言葉）のすぐ南に降ろす
export const TUTORIAL_START_POS = { x: 27, y: 9 };

// ============================================================
// フィールド（村の外＝世界地図）
// ============================================================
// ドラクエのように、村（詳細な1:1スケールのマップ）と、村の外に広がる世界地図
// （もっと大きな縮尺のミニマップ＝「縮図」）を、それぞれ別のマップとして持つ。
// 村の門にぶつかるとこちらのFIELD_MAPへシーンごと切り替わる。
//
// 縮図らしさの表現として、村の1マス=48pxに対し、フィールドは1マス=80px
// （FIELD_TILE_SIZE）と大きめにしてあり、木・岩などの置物も1マス=1つの塊として
// 置く（村のような3x3の細かい木ではない）。その上でマス数自体も64×48と村より
// 大幅に広くとり、「大陸を歩いているような」手応えのある広さにしてある
// （最初は32×24だったが、「もっと大きく、さらに二倍くらいに」という要望を受けて
// 縦横とも2倍に拡張した。村→ボス→さらに奥、と歩きごたえのある距離を用意し、
// 道中に森・岩山・湖といった地形のかたまりを点在させることで、ただ広いだけでなく
// 探索する意味を持たせている）。
export const FIELD_TILE_SIZE = 80;
const FIELD_GRID_WIDTH = 64;
const FIELD_GRID_HEIGHT = 48;

// 村へ戻る入り口（＝マップ上の「村」のアイコン）。ぶつかると村マップへ戻る。
// 大陸の南寄りに置き、そこから北へ向かって奥地（ボス→未知の領域）が広がる構成にしてある
export const FIELD_TOWN_ENTRANCE: Interactable = {
  id: "field-town-entrance",
  x: 32,
  y: 40,
  kind: "exit",
  label: "🏠",
  exitsTo: "town",
  dialogue: ["村の門をくぐり、中へ戻った。"],
};

// 修正済み：以前はここ（スライムの丘）に実際にキングスライムが立っていて、
// フィールドを歩いていて何も知らずに本番のボス戦へ突入してしまう作りだった。
// 今は村の門を出た瞬間に戦闘チュートリアルとしてキングスライム戦が始まる方式に
// 変えた（StoryGame.tsxのhandleBump、kind:"exit"の分岐参照）ので、この
// インタラクタブル自体はFIELD_INTERACTABLESに含めていない（walkして触れることはない）。
// ただし「スライムの丘」という地名・座標は、道や岩地の見た目を計算するのに
// まだ使っているので、データ自体は残してある
const FIELD_BOSS: Interactable = {
  id: "slime-king",
  x: 32,
  y: 24,
  kind: "boss",
  label: "👑",
  dialogue: [
    "ここは『スライムの丘』……何か強大な気配がする。",
    "もう少し言葉を集めてから来た方が良さそうだ。",
  ],
};

// ============================================================
// 他の章の本拠地への「行き先」だけ見える目印（ChapterSelect.tsxの鍵付き
// プレースホルダーの、世界地図上での見せ方）
// ============================================================
// 「村を出て世界地図を歩いていると、まだ入れない別の場所が視界に入る」という
// 世界の広がりを感じさせるための目印。frontend/DESIGN.md 7.1節の8章構成
// （はじまりの村→砂漠の町→魔法の森→…→魔王大陸、という一本道のチェーン）に
// 合わせて、2章「砂漠の町」・3章「魔法の森」への行き先を示す。実際に入れる
// エリアはまだ無いので、ぶつかると「まだ早い」と言われるだけの目印にとどめている
// （caveと同じ「コトに止められる」演出パターン）。章を実装するときは、この
// IDの場所に本物の入り口を差し替えればよい
export const FIELD_LANDMARKS: Interactable[] = [
  {
    // 修正済み：以前はkind:"object"で「今はまだ入れない」と止められるだけの
    // 目印だったが、1章クリア後は実際に2章「砂漠の町」へ入れるようにした
    id: "desert-town-entrance",
    x: 12,
    y: 16,
    kind: "exit",
    exitsTo: "desertTown",
    label: "",
    image: "/images/map/okimono/tileset/castle_desert_town.png",
    widthTiles: 1,
    heightTiles: 2,
    dialogue: [
      "大陸の西に、砂に埋もれかけた町の城壁が見える。",
      "コト「あれが噂の『砂漠の町』かな……武器屋や防具屋があるらしいよ。」",
      "コト「入ってみよう！」",
    ],
  },
  {
    id: "magic-forest-view",
    x: 52,
    y: 12,
    kind: "object",
    label: "🌲",
    dialogue: [
      "はるか遠くに、深い緑の森が広がっているのが見える。",
      "コト「あそこは『魔法の森』……妖精が住んでいるって聞いたことがあるよ。」",
      "コト「今の私たちには、まだ遠い場所だね。」",
    ],
  },
];

// FIELD_BOSSは含めない（上のコメント参照。キングスライムは村の門でのチュートリアル
// 戦闘としてのみ戦う。フィールド上に実際に立たせて触れられるようにはしていない）
export const FIELD_INTERACTABLES: Interactable[] = [FIELD_TOWN_ENTRANCE, ...FIELD_LANDMARKS];

// 大陸のあちこちに単発の木・岩を点在させて、ただの空き地ではなく探索しがいの
// ある地形に見えるようにしてある。フィールドは村よりマス目1つが大きいので、
// 木・岩は1マス=1つの塊として置く（村のような3x3の細かい木ではない）
const FIELD_TREE_POSITIONS: [number, number][] = [
  [20, 8], [28, 10], [40, 6], [4, 28], [4, 36], [24, 32], [56, 28], [60, 20], [36, 36], [8, 40],
  [46, 20], [18, 30], [50, 40], [30, 18],
];

const FIELD_STONE_POSITIONS: [number, number][] = [
  [36, 10], [20, 36], [44, 40], [8, 6], [48, 30], [16, 30], [56, 40], [12, 36],
];

const FIELD_TREE_SIZE = { widthTiles: 1, heightTiles: 1, blocksMovement: true };
const FIELD_STONE_SIZE = { widthTiles: 1, heightTiles: 1, blocksMovement: true };

// 砂漠の町（desert-town-entrance）を取り囲む砂丘と、魔法の森（magic-forest-view）を
// 取り囲む木立。切り出したタイル素材（processed/、backend/DESIGN.mdではなく
// public/images/map/okimono/tileset/に配置済み）を使い、行き先の目印がそれぞれの
// 章のテーマ（砂漠／森）に見えるようにしている。どちらもリング状に配置し、
// 南（砂丘）・北（木立）側に1マスぶんの隙間を空けて、内側の目印まで歩いて
// 入れるようにしてある
const TILESET_DIR = "/images/map/okimono/tileset";

const DESERT_DUNE_RING: [number, number][] = [
  [10, 14], [11, 14], [12, 14], [13, 14], [14, 14],
  [10, 15], [14, 15],
  [10, 16], [14, 16],
  [10, 17], [14, 17],
  [10, 18], [11, 18], [13, 18], [14, 18],
];

const FOREST_RING: [number, number][] = [
  [50, 10], [51, 10], [52, 10], [53, 10], [54, 10],
  [50, 11], [50, 13],
  [54, 11], [54, 12], [54, 13],
  [50, 14], [51, 14], [52, 14], [53, 14], [54, 14],
];

// 同じ画像・同じ大きさの置物を、座標のリストだけで量産するヘルパー
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

// リングを構成する1マスずつに、切り出した9枚の中から順番に別の絵をあてて、
// 単調な繰り返しに見えないようにする（同じ絵が並ばないようにするための工夫）
function scatterVariedTexture(
  idPrefix: string,
  textureBaseName: string,
  variantCount: number,
  positions: [number, number][]
): PlacedObject[] {
  return positions.map(([x, y], index) => ({
    id: `${idPrefix}-${index}`,
    image: `${TILESET_DIR}/${textureBaseName}_${(index % variantCount) + 1}.png`,
    x,
    y,
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
  }));
}

// 砂地・岩地それぞれの雰囲気を補強する一点物の飾り。ピラミッドは2章「砂漠の町」の
// マップ構成（frontend/app/story/WORLD_DESIGN.md参照）にも登場する建物なので、
// 世界地図側にも一足先にちらっと見せておく伏線を兼ねている
const FIELD_ACCENT_DECORATIONS: PlacedObject[] = [
  { id: "field-pyramid", image: `${TILESET_DIR}/icon_pyramid.png`, x: 6, y: 10, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "field-hill-orange", image: `${TILESET_DIR}/icon_hill_orange.png`, x: 18, y: 10, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "field-hill-gray", image: `${TILESET_DIR}/icon_hill_gray.png`, x: 4, y: 20, widthTiles: 1, heightTiles: 1, blocksMovement: true },
  { id: "field-crate", image: `${TILESET_DIR}/icon_crate_a.png`, x: 34, y: 22, widthTiles: 1, heightTiles: 1, blocksMovement: false },
];

export const FIELD_OBJECTS: PlacedObject[] = [
  ...scatterObjects("field-tree", "/images/map/okimono/tree2.png", FIELD_TREE_SIZE, FIELD_TREE_POSITIONS),
  ...scatterObjects("field-stone", "/images/map/okimono/isi.png", FIELD_STONE_SIZE, FIELD_STONE_POSITIONS),
  ...scatterVariedTexture("desert-dune", "texture_sand_dune", 9, DESERT_DUNE_RING),
  ...scatterVariedTexture("magic-forest-tree", "texture_forest", 9, FOREST_RING),
  ...FIELD_ACCENT_DECORATIONS,
];

// フィールドの当たり判定。村と同じく、外周は必ず壁。木立・岩山（blocksMovement）の
// 置いてあるマスも壁にする。フィールドの置物はすべて1x1マスなので、村のような
// footprintOf/blockFootprintの矩形計算は不要で、該当マスをそのまま壁にするだけでよい
function buildFieldTiles(): GridMap["tiles"] {
  const tiles: GridMap["tiles"] = Array.from({ length: FIELD_GRID_HEIGHT }, () =>
    Array<GridMap["tiles"][number][number]>(FIELD_GRID_WIDTH).fill("floor")
  );

  for (const object of FIELD_OBJECTS) {
    if (!object.blocksMovement) continue;

    tiles[object.y][object.x] = "wall";
  }

  for (let x = 0; x < FIELD_GRID_WIDTH; x++) {
    tiles[0][x] = "wall";
    tiles[FIELD_GRID_HEIGHT - 1][x] = "wall";
  }
  for (let y = 0; y < FIELD_GRID_HEIGHT; y++) {
    tiles[y][0] = "wall";
    tiles[y][FIELD_GRID_WIDTH - 1] = "wall";
  }

  return tiles;
}

// フィールドの床の見た目。村ほど込み入った地形が無いので、ASCIIを手書きせず
// コードで生成している。村の門（FIELD_TOWN_ENTRANCE）からボス（FIELD_BOSS）へ
// まっすぐ土の道を通し、東側に小さな湖を置いてある。新しく切り出したタイル素材
// （sand/stone）を使って、砂漠の町（desert-town-entrance）の周りは砂地、
// スライムの丘（FIELD_BOSS）の周りは岩地にして、それ以外は開けた草地にしてある。
// 判定の優先順位は 湖 > 道 > 砂地 > 岩地 > 草地（デフォルト）
const FIELD_PATH_X = 32;
const FIELD_LAKE = { x0: 40, x1: 47, y0: 28, y1: 34 };
const FIELD_SAND_REGION = { x0: 3, x1: 21, y0: 9, y1: 23 };
const FIELD_STONE_REGION = { x0: 26, x1: 38, y0: 19, y1: 29 };

function inRegion(x: number, y: number, region: { x0: number; x1: number; y0: number; y1: number }): boolean {
  return x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1;
}

const FIELD_FLOOR_ROWS: string[] = Array.from({ length: FIELD_GRID_HEIGHT }, (_, y) =>
  Array.from({ length: FIELD_GRID_WIDTH }, (_, x) => {
    if (x >= FIELD_LAKE.x0 && x <= FIELD_LAKE.x1 && y >= FIELD_LAKE.y0 && y <= FIELD_LAKE.y1) return "~";
    if (x === FIELD_PATH_X && y >= FIELD_BOSS.y && y <= FIELD_TOWN_ENTRANCE.y) return "#";
    if (inRegion(x, y, FIELD_SAND_REGION)) return "s";
    if (inRegion(x, y, FIELD_STONE_REGION)) return "o";
    return ".";
  }).join("")
);

export const FIELD_FLOOR_TEXTURES: FloorTileType[][] = parseFloorRows(
  FIELD_FLOOR_ROWS,
  FIELD_GRID_HEIGHT,
  FIELD_GRID_WIDTH,
  "FIELD_FLOOR_ROWS"
);

// フィールドの開始位置は、村の門アイコン（FIELD_TOWN_ENTRANCE）のすぐ北
export const FIELD_MAP: GridMap = {
  tiles: buildFieldTiles(),
  start: { x: FIELD_TOWN_ENTRANCE.x, y: FIELD_TOWN_ENTRANCE.y - 1 },
};

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
  { kana: "ねこ", kanji: "猫", hint: "村を歩き回る猫" },
  { kana: "いぬ", kanji: "犬", hint: "村を歩き回る犬" },
  { kana: "き", kanji: "木", hint: "村の中央広場の木" },
  { kana: "いし", kanji: "石", hint: "村の北東に積まれた石の山" },
  { kana: "はな", kanji: "花", hint: "村に咲いている花" },
  { kana: "くさ", kanji: "草", hint: "生い茂った草むら（未実装）" },
  { kana: "ゆうき", kanji: "勇気", hint: "スライムキングを倒す" },
  { kana: "もり", kanji: "森", hint: "砂漠の町の旅人" },
];
