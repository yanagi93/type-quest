"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GridExplorer } from "./GridExplorer";
import { StoryDialogue } from "./StoryDialogue";
import { NamingModal } from "./NamingModal";
import { TitleScreen } from "./TitleScreen";
import { Menu } from "./Menu";
import {
  useStoryState,
  readAndClearStoryBattleResult,
  hasPendingStoryBattleResult,
  DEFAULT_MAX_HP,
  getAllSlotSummaries,
  type Chapter1State,
} from "./useStoryState";
import { useWanderers } from "./useWanderers";
import { HomeButton } from "@/components/HomeButton";
import { Button } from "@/components/ui/8bit/button";
import {
  TOWN_MAP,
  TOWN_INTERACTABLES,
  TOWN_WANDERERS,
  TOWN_TILE_SIZE,
  TOWN_FLOOR_TEXTURES,
  TOWN_OBJECTS,
  TOWN_REENTRY_POS,
  FIELD_START,
  buildFieldMap,
  buildFieldObjects,
  FIELD_TILE_SIZE,
  FIELD_FLOOR_TEXTURES,
  FIELD_MAINLAND_BOUNDARY_X,
  FIELD_INTERACTABLES,
  FIELD_STRENGTH_PUZZLE_WORD,
  FIELD_STRENGTH_PUZZLE_ROCK_ID,
  FIELD_BOSS_IDS,
  BOSS_UNLOCK_WORD_COUNT,
  CHAPTER1_WORD_DICTIONARY,
  WORD_EXCLUDED_FROM_COUNT,
  NAME_UNLOCK_WORD_KANA,
  TUTORIAL_START_POS,
  RANDOM_NAME_POOL,
  HOUSE_ELDER_POST_BOSS,
  DESERT_TOWN_ENTRANCE_POS,
} from "./chapter1Data";
import {
  DESERT_TOWN_MAP,
  DESERT_TOWN_INTERACTABLES,
  DESERT_TOWN_OBJECTS,
  DESERT_TOWN_TILE_SIZE,
  DESERT_TOWN_FLOOR_TEXTURES,
} from "./chapter2Data";
import {
  FAIRY_VILLAGE_MAP,
  FAIRY_VILLAGE_INTERACTABLES,
  FAIRY_VILLAGE_OBJECTS,
  FAIRY_VILLAGE_TILE_SIZE,
  FAIRY_VILLAGE_FLOOR_TEXTURES,
} from "./chapter3Data";
import type { DialoguePortrait, Interactable } from "./types";

// 魔法の森（3章）への目印（magic-forest-view）を実際に開放する条件の言葉。
// 砂漠の町の旅人（chapter2Data.ts、desert-traveler）から教わる
const FOREST_UNLOCK_WORD = "もり";

// タイトル画面を一度通過したかどうかをこのタブの間だけ覚えておくためのキー
// （showTitleの初期化・dismissTitle参照）
const TITLE_SEEN_SESSION_KEY = "storyTitleSeenThisSession";

// 敵が多すぎるという指摘を受けて0.15から引き下げた。さらに、戦闘から戻った直後に
// また即エンカウントするとテンポが悪いので、SAFE_STEPS_AFTER_BATTLEぶんは必ず
// 歩けるようにしている（stepsSinceBattleRef参照）
const ENCOUNTER_CHANCE_PER_STEP = 0.08;
const SAFE_STEPS_AFTER_BATTLE = 6;

// 村（TOWN_TILE_SIZE=48）はフィールド（FIELD_TILE_SIZE=80）よりマスが小さいぶん、
// GridExplorerのデフォルト表示範囲（800x560px）だと同時に描画するマス数が多くなり
// 動きが重くなりがちだった。村のときだけ少し狭い表示範囲にして描画量を減らす
const TOWN_VIEWPORT_WIDTH = 640;
const TOWN_VIEWPORT_HEIGHT = 480;

// 会話用の立ち絵画像（frontend/public/images/kaiwa/）。
// マップ上の歩行用スプライトとは別に、会話ウィンドウ専用の絵が用意されている
const PLAYER_PORTRAIT_IMAGE = "/images/kaiwa/syuzinkousyoumen.png";
const KOTO_PORTRAIT_IMAGE = "/images/kaiwa/kotodamanosei1.png";
const ELDER_PORTRAIT_IMAGE = "/images/kaiwa/tyourou.png";
// マップ上を歩くstrangerのスプライト（mura/nazosyounennumei.png）はフードを
// 被った顔の見えない姿なので、会話用の立ち絵も同じ「正体不明」バージョン
// （nazonoseinenhumei）にそろえてある。顔がはっきり見えるnazonoseinen1は、
// 後の章で正体を明かす演出用に取ってある
const STRANGER_PORTRAIT_IMAGE = "/images/kaiwa/nazonoseinenhumei1.png";
const CAT_MAP_IMAGE = "/images/map/mura/neko.png";
const DOG_MAP_IMAGE = "/images/map/mura/dog.png";

// 村人の会話用の立ち絵（kaiwa/murabitoN.png）は、マップ用のスプライト
// （mura/murabitoN.png）と見た目が一致するように選んである。見比べると
// kaiwaのmurabito1/2はおばあさん（長老専用）、murabito3/4はひげの職人風、
// murabito5/6は少年、という3人×2パターンずつなので、マップ側で使っている
// 「職人風（mura/murabito2.png）」「少年風（mura/murabito3.png）」に対応する
// kaiwa画像だけを割り当てている（同じ人物なのに会話で別人の顔が出ないように）
const VILLAGER_PORTRAIT_IMAGES: Record<string, string> = {
  "wanderer-nw": "/images/kaiwa/murabito3.png",
  "wanderer-sw": "/images/kaiwa/murabito4.png",
  "wanderer-se": "/images/kaiwa/murabito3.png",
  "wanderer-e": "/images/kaiwa/murabito5.png",
  "wanderer-s": "/images/kaiwa/murabito6.png",
  "house-fire": "/images/kaiwa/murabito4.png",
  "house-wind": "/images/kaiwa/murabito6.png",
};

const PLAYER_PORTRAIT: DialoguePortrait = { side: "left", name: "主人公", image: PLAYER_PORTRAIT_IMAGE };
const KOTO_LEFT: DialoguePortrait = { side: "left", name: "コト", image: KOTO_PORTRAIT_IMAGE };
const KOTO_RIGHT: DialoguePortrait = { side: "right", name: "コト", image: KOTO_PORTRAIT_IMAGE };
const ELDER_RIGHT: DialoguePortrait = { side: "right", name: "長老", image: ELDER_PORTRAIT_IMAGE };

// 名づけ前のセリフ・立ち絵で使っている「まだ名前を知らない」プレースホルダー名。
// 名づけた後は、これらをすべて実際に付けた名前に書き換える（村人は「村人」、
// 長老だけは特別に「長老」という肩書きで書かれている。isNameableCharacter参照）
const UNNAMED_PLACEHOLDER_NAMES = ["村人", "長老"];

function replaceUnnamedPlaceholder(text: string, npcName: string): string {
  return UNNAMED_PLACEHOLDER_NAMES.reduce((line, placeholder) => line.replaceAll(placeholder, npcName), text);
}
// 夢の中に出てくる「誰か」。正体はまだ明かさないので、姿は謎の青年と同じ
// 顔を隠したバージョンのまま出す
const DREAM_STRANGER_PORTRAIT: DialoguePortrait = { side: "right", name: "誰か", image: STRANGER_PORTRAIT_IMAGE };

// 第1章より前に流れる、世界観だけを説明する短いプロローグ。
// まだ主人公の個人的な記憶（夢のシーン）には触れず、「なぜ言葉が消えたのか」
// はここでは明かさない（終盤の章で少しずつ明らかになっていく構成にしたいので）。
const PROLOGUE_LINES = [
  "はるか昔、世界には「言霊（ことだま）」と呼ばれる力があった。",
  "言葉には人の想いが宿り、魔法も、歴史も、絆も、すべてを言霊が形作っていた。",
  "けれど、いつしか人は言葉で傷つけ合うようになった。",
  "嘘。悪口。呪い。戦争。",
  "魔王は、世界中の言霊を封印した。",
  "その日から、世界は静寂に包まれている――。",
];

// プロローグは1行ごとに背景が変わる演出にしてある（PROLOGUE_LINESと同じ順番・
// 同じ数）。画像はまだ用意していないので、ここに書いたパスのファイルを
// frontend/public/images/back-ground/ に置くだけで自動的に表示される
// （StoryDialogue.tsx側は画像が無くても崩れないようになっている）
const PROLOGUE_BACKGROUNDS = [
  "/images/back-ground/prologue-1.png",
  "/images/back-ground/prologue-2.png",
  "/images/back-ground/prologue-3.png",
  "/images/back-ground/prologue-4.png",
  "/images/back-ground/prologue-5.png",
  "/images/back-ground/prologue-6.png",
];

// 夜ごと見る夢のシーン。ここで立ち絵として出てくる「誰か」は、実は後で村の
// 門の近くに現れる「謎の青年」と同一人物（顔を隠したまま）。この時点では
// まだそれと明言しない（正体は後の章で少しずつ明かす）が、姿だけ一足先に
// 見せておくことで、後で青年に会ったときに「あ、夢に出てきた人だ」と
// プレイヤーが気づけるようにしている
const DREAM_LINES = [
  "夜、いつもとおなじ夢を見る。",
  "幼い自分の前に、誰かが立っている。",
  "「君ならきっと……」",
  "――そこで、いつも夢は途切れる。",
];

// 夢のシーンの背景。2枚だけ用意すれば、1枚目は最初の行（まだ誰も出てきていない
// 夜の場面）だけに使われ、2枚目は「誰か」が現れて以降の行すべてに使い回される
// （渡した枚数がlinesより少ないときは末尾の画像が続くという、StoryDialogue.tsx側の
// 仕様を利用している。立ち絵で「誰か」の姿は出しているので、背景側は行ごとに
// 何度も変える必要はなく、この2段階で十分）
const DREAM_BACKGROUNDS = [
  "/images/back-ground/dream-1.png",
  "/images/back-ground/dream-2.png",
];

// 長老が直接しゃべると、おとぎ話のようなプロローグの雰囲気とちぐはぐになって
// しまうため、ここは長老のセリフを直接引用せず、地の文の説明だけにしてある。
// 姿だけは専用の立ち絵（tyourou.png）で見せる（下のレンダー側でportraitsを渡す）
const ELDER_VISIT_LINES = [
  "翌朝、村の長老に呼ばれ、一冊の古びた本を渡された。",
  "『言霊の書』――村の中を歩いて、思い出せる言葉を探すようにと言われた。",
];

const ELDER_VISIT_BACKGROUNDS = [
  "/images/back-ground/elder-visit-1.png",
  "/images/back-ground/elder-visit-2.png",
];

// 長老の家を出た後、本を開いてコトに初めて会う場面の背景。1枚目は本を開く前
// （まだコトが出てきていない）行だけに使われ、2枚目は光が舞い上がって以降の
// コトが喋っている行すべてに使い回される（DREAM_BACKGROUNDSと同じ考え方）
const MEET_KOTO_BACKGROUNDS = [
  "/images/back-ground/meet-koto-1.png",
  "/images/back-ground/meet-koto-2.png",
];

// 長老の家を出た後、本を開いてコトに初めて会う場面。第1章はコトの誘導で進む
// チュートリアルに近い体験にしたいので、最後にすぐそばの花壇へ案内する一言を
// 加えてある（このシーンの終了後、TUTORIAL_START_POSで花壇のすぐ南に降りる）
const MEET_KOTO_LINES = [
  "長老に渡された『言霊の書』を、そっと開いてみた。",
  "すると、本の中から小さな光がふわりと舞い上がった。",
  "コト「わあ、久しぶりの外だぁ！」",
  "コト「こんにちは！ 私はコト！」",
  "コト「世界中に散らばった言葉……言霊を、一緒に集めよう！」",
  "コト「まずは近くにある花壇に行ってみよう。ほら、すぐそこだよ！」",
];

// 誘導チュートリアルの最初の目標（花壇）。これを覚えるまでは、他の何にぶつかっても
// handleBumpが花壇へ軌道修正する（下のTUTORIAL_TARGET_KANA/IDを参照）
const TUTORIAL_TARGET_KANA = "はな";
const TUTORIAL_TARGET_ID = "flowerbed-elder";

// 家（house-*）はkind:"npc"だが実際に喋る人がいるわけではない建物データなので、
// 名づけ対象からは除外する（住人が誰もいない鍵のかかった家に名前をつけるのは
// 不自然、という指摘への対応）。ただしhouse-elderだけは例外で、ボス撃破後は
// 長老自身が実際にそこにいる体になる（HOUSE_ELDER_POST_BOSS参照）ので対象に含める
function isNameableCharacter(id: string): boolean {
  if (id === "stranger") return false;
  if (id.startsWith("house-") && id !== "house-elder") return false;
  return true;
}

// 名づけミッション（8.2節）の完了条件。以前は村人・NPC全員（NAMEABLE_NPC_IDS＝
// TOWN_INTERACTABLES+TOWN_WANDERERSのkind:"npc"全部）を対象にしていたが、
// 「全員に名づけるのは時間がかかる」という指摘を受け、長老1人に名前をつけたら
// 完了する形に変更した（長老＝house-elder。ボス撃破後にHOUSE_ELDER_POST_BOSSへ
// 差し替わって初めてぶつかれる・名づけられるようになる）
const NAMEABLE_NPC_IDS = ["house-elder"];

// メニューのフィールドマップに黄色いリングで示す「次に目指す場所」を、進行度から
// 自動で決める（ミッション性を出すための演出。8.2節）。地図自体が長老に名づけた後
// （bridgeBuilt）にしか手に入らないので、実質的には常に「次の土地（砂漠の町）」を
// 指すことになるが、将来の章が増えたときにここへ分岐を足していけるようにしてある
function getFieldObjective(state: Chapter1State): { x: number; y: number } | null {
  if (!state.bridgeBuilt) return null;
  return DESERT_TOWN_ENTRANCE_POS;
}

// 修正済み：以前はこの後 章選択画面（scene: "select"）に戻していたが、
// 「章選択を挟まず、そのままフィールド探索に続けたい」という要望を受けて、
// 最後にフィールド探索を促す一言を足し、onComplete側もフィールドへ直接つなげる
// ようにした（StoryGame.tsx本体のuseEffect参照）
const ENDING_LINES = [
  "スライムキングをたおした。",
  "『なまえ』という言霊を思い出した。",
  "――夢の中、幼い自分が誰かたちと笑っている。",
  "けれど、顔だけがどうしても思い出せない。",
  "第1章 クリア！",
  "コト「そうだ、村に戻って長老に会いに行こう！」",
  "コト「長老の名前、まだちゃんと聞いたことがなかったんだ。」",
  "コト「名前をつけてあげたら、言霊の力で何かが起きるかもしれないよ！」",
];

// HPが0になって力尽きたときに流れる、村に戻ってコトに励まされる復活シーン。
// 「やられた→村に戻るボタンを押す」だけの機械的な処理ではなく、物語の一部として
// 自然に立ち直らせるための演出（フィールド戦・ボス戦どちらの敗北でも共通で使う）
const REVIVAL_LINES = [
  "目の前が真っ白になって……気づくと、村の広場に横たわっていた。",
  "コト「大丈夫！？ ムリしすぎだよ……。」",
  "コト「言葉はね、力任せに打ち込んでも、うまく力を発揮してくれないんだ。」",
  "コト「落ち着いて、ひとつひとつの言葉を丁寧に紡いでみよう。」",
  "コト「さあ、もう一度がんばろう！ 私もついてるから。」",
];

type Dialogue = { lines: string[]; title?: string; portraits?: DialoguePortrait[]; onComplete: () => void };

// ぶつかった相手ごとに、会話ウィンドウの左右に出す立ち絵を決める。
// ・樽: 主人公が左、コトが右（一緒に中身をのぞきこむイメージ）
// ・村人・猫・犬（歩き回るNPC）: コト（か主人公）が左、相手が右
// ・井戸など、コトだけが解説する置物: コトのみ
// 特に決まりが無いもの（出口・ボスの様子見など）は立ち絵無しにしている。
// 長老の家（house-elder）は、ボス撃破前は長老がその場にいないのに壁越しに喋るのは
// 不自然なので長老自身のセリフ・立ち絵は無し（主人公・コトの立ち絵のみ）。
// ボス撃破後はHOUSE_ELDER_POST_BOSS（grantsItem:"map"）に差し替わり、長老が実際に
// そこにいる体になるので、このときだけ長老自身の立ち絵を出す
function getPortraitsForInteractable(interactable: Interactable): DialoguePortrait[] | undefined {
  // house-elderはgrantsItemを持つ場合（＝ボス撃破後のHOUSE_ELDER_POST_BOSS）も
  // 樽と同じ構図にはせず、長老自身の立ち絵を出したいので、grantsItemの汎用判定より
  // 先にここで分岐させる
  if (interactable.id === "house-elder") {
    return interactable.grantsItem === "map" ? [PLAYER_PORTRAIT, ELDER_RIGHT] : [PLAYER_PORTRAIT, KOTO_RIGHT];
  }

  // 樽（中身入り・空っぽ問わず）は主人公とコトが一緒に中をのぞきこむ構図で統一する
  if (interactable.grantsItem || interactable.id.startsWith("barrel")) {
    return [PLAYER_PORTRAIT, KOTO_RIGHT];
  }

  if (interactable.id === "stranger") {
    return [PLAYER_PORTRAIT, { side: "right", name: "謎の青年", image: STRANGER_PORTRAIT_IMAGE }];
  }

  if (interactable.id === "sleepy-villager") {
    return [KOTO_LEFT, { side: "right", name: "村人", image: "/images/kaiwa/murabito4.png" }];
  }

  // 猫・犬は専用の会話用立ち絵が無いので、マップ上と同じ画像をそのまま使う
  // （村人のように会話用に別の絵を用意すると、マップの見た目と違う顔になってしまうため）
  if (interactable.id === "wanderer-cat") {
    return [KOTO_LEFT, { side: "right", name: "猫", image: CAT_MAP_IMAGE }];
  }

  if (interactable.id === "wanderer-dog") {
    return [KOTO_LEFT, { side: "right", name: "犬", image: DOG_MAP_IMAGE }];
  }

  if (interactable.id.startsWith("wanderer-") || interactable.id === "house-fire" || interactable.id === "house-wind") {
    const villagerImage = VILLAGER_PORTRAIT_IMAGES[interactable.id];
    const rightPortrait: DialoguePortrait = villagerImage
      ? { side: "right", name: "村人", image: villagerImage }
      : { side: "right", name: "村人", emoji: interactable.label || "🧑" };

    // ねこ・いぬのように言葉を教えてくれる相手はコトが説明役として左に立つ。
    // ただ立っているだけの村人（言葉を教えない）は、コトはまだ出てきていない体で
    // 主人公だけが左に立つ
    return [interactable.teachesWord ? KOTO_LEFT : PLAYER_PORTRAIT, rightPortrait];
  }

  // 中央広場の木4本（「き」を覚える場所）・石の山（「いし」を覚える場所）・
  // 花壇（「はな」を覚える最初のチュートリアル場所）も、井戸と同じくコトだけが解説する構図
  if (
    interactable.id === "well" ||
    interactable.id.startsWith("plaza-tree-") ||
    interactable.id === "stone-pile" ||
    interactable.id === "grass-word" ||
    interactable.id === "flowerbed-elder"
  ) {
    return [KOTO_LEFT];
  }

  // 洞窟でコトが直接止めてくれる場面。主人公・コトの2人での会話にする
  // （入り口が2マス分あるので、cave-leftからでも同じ会話・同じ立ち絵になる）
  if (interactable.id === "cave" || interactable.id === "cave-left") {
    return [PLAYER_PORTRAIT, KOTO_RIGHT];
  }

  return undefined;
}

// 覚えた言葉のうち、ボス解放・村を出る条件としてカウントする数。
// 「はな」以外の覚えた言葉ならなんでもカウントする（ねこ・いぬ等でもOK）方式
// （はなは最初に必ず手に入る言葉なので、これ自体はノーカウントにしてある）。
// 「なまえ」もボス撃破時の専用報酬（8.2節）なので、同じ理由でカウントから除く
// （ボスを倒した時点で既に条件は満たしているので実害は無いが、
// 「おぼえた言葉：4/3」のような表示のズレを防ぐため）
function countRequiredWordsLearned(wordsLearned: string[]): number {
  return wordsLearned.filter((kana) => kana !== WORD_EXCLUDED_FROM_COUNT && kana !== NAME_UNLOCK_WORD_KANA).length;
}

export function StoryGame() {
  const router = useRouter();
  const { state, update, learnWord, openChest, useHpBook, usePotion, addJournalEntry, saveToSlot, loadFromSlot } =
    useStoryState();
  // 名づけミッション完了（state.bridgeBuilt）で始まりの島↔本土の橋が架かるかどうかを
  // 反映した、フィールドの当たり判定・置物。128x96グリッド全体を毎回作り直すのは
  // 無駄なので、bridgeBuiltが変わったときだけ計算し直す
  const fieldMap = useMemo(() => buildFieldMap(state.bridgeBuilt), [state.bridgeBuilt]);
  const fieldObjects = useMemo(() => buildFieldObjects(state.bridgeBuilt), [state.bridgeBuilt]);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  // 名づけイベント中の状態。プレイヤー自身の名前か、村人（npcNamesのid）かで
  // 送信後の処理が変わる（handleNamingSubmit参照）。コトの一言→この状態→
  // NamingModal、という順で開く（handleBump参照）。portraitsは、名づけた後の
  // 「照れながら名前を言う」演出（handleNamingSubmit）で同じ立ち絵を使い回すために持たせてある
  const [namingPrompt, setNamingPrompt] = useState<
    { kind: "player"; portraits?: DialoguePortrait[] } | { kind: "npc"; id: string; portraits?: DialoguePortrait[] } | null
  >(null);
  const [showMenu, setShowMenu] = useState(false);
  // タイトル画面（はじめから／つづきから）を表示中かどうか。永続化されるstateとは
  // 別の、ローカルな表示フラグ。
  // 修正済みのバグ：以前は常にtrueから始めていたため、/battleからのハード
  // ナビゲーション（window.location.href = "/story"。/battle→/storyは常にこの
  // 方式で、ページを完全に作り直す）で村やフィールドへ戻ってくるたびに、StoryGame
  // ごと再マウントされてこのstateもtrueにリセットされ、毎回タイトル画面（セーブ選択
  // 画面）を経由しないと先へ進めなくなっていた（ボスを倒した直後もこれに該当し、
  // 「フィールドへ行けず、セーブ画面が出る」ように見えていた）。
  // sessionStorageに「このタブでは既にタイトルを通過した」印を残しておき、
  // 2回目以降のマウントではタイトルを飛ばすようにした（ブラウザを閉じる・新しい
  // タブを開くと消えるので、次に開いたときはちゃんとタイトルから始まる）
  // 追加の保険：セッションの印が何らかの理由で欠けていても、/battleからの
  // 戦闘結果（hasPendingStoryBattleResult）が残っている場合は、それだけで
  // 「今まさに村・フィールドへ戻ってきた瞬間」だと確定できるので、無条件で
  // タイトルをスキップする（このチェックのほうが、セッションの印より確実）。
  // 修正済み：初期値をwindow/sessionStorageの有無で分岐させていたため、
  // サーバー側レンダー（window無し＝常にtrue）とクライアント側の初回レンダー
  // （window有り＝実際の判定結果）が食い違い、Hydration failedエラーになっていた。
  // 初回は必ずtrue（サーバーと同じ）から始め、マウント直後のuseLayoutEffectで
  // クライアント側の実際の値に合わせる（paint前に反映されるので、ちらつきは
  // ほぼ発生しない）
  const [showTitle, setShowTitle] = useState(true);

  useLayoutEffect(() => {
    if (hasPendingStoryBattleResult()) {
      setShowTitle(false);
      return;
    }

    if (window.sessionStorage.getItem(TITLE_SEEN_SESSION_KEY) === "1") {
      setShowTitle(false);
    }
  }, []);

  const dismissTitle = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TITLE_SEEN_SESSION_KEY, "1");
    }

    setShowTitle(false);
  };
  // 戦闘（フィールドの雑魚戦）から戻った直後、最低SAFE_STEPS_AFTER_BATTLE歩は
  // 次のエンカウントを発生させないための歩数カウンタ。0で始めるので、
  // フィールドに出た直後の最初の数歩はガード無し（村を出てすぐは、この方針で問題ない）
  const stepsSinceBattleRef = useRef(0);

  // 村を歩き回るNPC（村人・猫・犬）の現在位置。会話中や町にいない間は歩みを止める。
  // Reactのフックのルール上、シーンによる早期returnより前で必ず呼ぶ必要がある
  const wanderers = useWanderers(
    TOWN_WANDERERS,
    TOWN_MAP,
    state.playerPos,
    dialogue !== null || showMenu || state.scene !== "town"
  );

  // /battle から戻ってきたときの結果を一度だけ処理する
  useEffect(() => {
    const result = readAndClearStoryBattleResult();

    if (!result) return;

    // 戦闘から戻った直後は、次のエンカウントまでの猶予歩数をリセットする
    stepsSinceBattleRef.current = 0;

    // 戦闘中に敵を倒して見つけた言葉は、勝敗に関わらずそのまま覚える
    result.learnedWords?.forEach((kana) => learnWord(kana));

    if (result.outcome === "lose") {
      // HPが0になったときは、そのままの位置に戻すのではなく、村に戻した上で
      // コトに励まされて立ち直る、という物語の一部として演出する
      // （フィールド戦・ボス戦のどちらで負けても同じ扱いでよい）
      update({
        playerHp: result.hp,
        maxPlayerHp: result.maxHp,
        scene: "town",
        playerPos: TOWN_MAP.start,
      });
      // localStorageの戦闘結果（外部システム）を読んだ結果としての一度きりの反映なので、
      // レンダー中に計算し直せる値ではない。ここでのsetState呼び出しは意図的なもの
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialogue({
        lines: REVIVAL_LINES,
        portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
        onComplete: () => setDialogue(null),
      });
      return;
    }

    // HPは勝ったときはそのまま持ち越す
    const patch: Partial<Chapter1State> = { playerHp: result.hp, maxPlayerHp: result.maxHp };

    if (result.encounter === "boss" && result.outcome === "win") {
      // 「なまえ」を覚えると、村人（kind:"npc"）に名前をつけられるようになる
      // （handleBumpのnpcNames判定参照）
      learnWord(NAME_UNLOCK_WORD_KANA);
      // 倒したボスの章番号（&chapter=）+1を次の章として進める。読み取れない場合は
      // 念のため現在のcurrentChapterをそのまま使う（章が進まないだけで、壊れはしない）
      update({
        ...patch,
        scene: "ending",
        bossDefeated: true,
        currentChapter: (result.chapter ?? state.currentChapter) + 1,
      });
    } else {
      // フィールド戦に勝った場合は、そのままの位置で探索へ戻るだけでよい
      update(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マップの当たり判定データを直したとき（今回のように解像度を変えたときなど）、
  // localStorageに残っている古い座標のセーブだと、新しいマップでは壁の中に
  // なってしまうことがある。読み込んだ位置が現在のマップで床でなければ
  // （壁や範囲外なら）、そのマップの初期位置へ自動で戻す安全装置。
  useEffect(() => {
    const walkableScenes = ["town", "field", "desertTown", "fairyVillage"] as const;
    if (!walkableScenes.includes(state.scene as (typeof walkableScenes)[number])) return;

    const map =
      state.scene === "town"
        ? TOWN_MAP
        : state.scene === "desertTown"
        ? DESERT_TOWN_MAP
        : state.scene === "fairyVillage"
        ? FAIRY_VILLAGE_MAP
        : fieldMap;
    const { x, y } = state.playerPos;
    const tile = map.tiles[y]?.[x];

    if (tile !== "floor") {
      update({ playerPos: map.start });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scene, state.playerPos.x, state.playerPos.y]);

  // タイトル画面の「はじめから」から呼ばれる。進行状況を完全にリセットして1章の
  // プロローグから始める（「つづきから」はこれを呼ばず、今のstateのままタイトルを
  // 閉じるだけ。StoryGame.tsx本体のshowTitle判定を参照）
  const handleEnterChapter1 = () => {
    update({
      scene: "prologue",
      currentChapter: 1,
      playerPos: TOWN_MAP.start,
      wordsLearned: [],
      bossDefeated: false,
      hasHadFirstBattle: false,
      hasMetStranger: false,
      chestsOpened: [],
      attackBooks: 0,
      defenseBooks: 0,
      hpBooks: 0,
      potions: 0,
      journalEntries: [],
      playerHp: DEFAULT_MAX_HP,
      maxPlayerHp: DEFAULT_MAX_HP,
      playerName: "",
      npcNames: {},
      bridgeBuilt: false,
    });
  };

  // 言霊の書の「記録する」ボタンから呼ばれる。実際のセーブ自体はuseStoryStateが
  // 常に自動でやっているので、ここでは旅の記憶を1行書き加えるだけでよい
  const handleSaveJournal = () => {
    const entryNumber = state.journalEntries.length + 1;

    addJournalEntry(
      `旅の記憶 その${entryNumber}：おぼえた言葉 ${state.wordsLearned.length}個、HP ${state.playerHp}/${state.maxPlayerHp}`
    );
  };

  const handleBump = (interactable: Interactable) => {
    const portraits = getPortraitsForInteractable(interactable);

    // コトの誘導チュートリアル中（まだ「はな」を覚えていない間）は、花壇以外の
    // 何にぶつかってもその場のやり取りを処理せず、花壇へ軌道修正する。花壇を
    // 覚えた瞬間にこの制限は外れ、以降は通常どおり自由に探索できる
    const tutorialTargetLearned = state.wordsLearned.includes(TUTORIAL_TARGET_KANA);

    if (!tutorialTargetLearned && interactable.id !== TUTORIAL_TARGET_ID) {
      setDialogue({
        lines: ["コト「あ、まずはさっきの花壇に行ってみようよ！」"],
        portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
        onComplete: () => setDialogue(null),
      });
      return;
    }

    // 魔法の森（3章）への目印。「もり」を覚えていれば実際に入れる特別扱い
    // （データ上はずっとkind:"object"のままなので、ここで動的に判定している）
    if (interactable.id === "magic-forest-view" && state.wordsLearned.includes(FOREST_UNLOCK_WORD)) {
      setDialogue({
        lines: [
          "はるか遠くに見えていた深い緑の森が、すぐそこまで近づいている。",
          "コト「『もり』の言葉のおかげで、道が見えるようになったのかも！」",
          "コト「魔法の森へ、行ってみよう！」",
        ],
        portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
        onComplete: () => {
          setDialogue(null);
          update({ scene: "fairyVillage", playerPos: FAIRY_VILLAGE_MAP.start });
        },
      });
      return;
    }

    // 名づけ済みのキャラクター（kind:"npc"）は、セリフの話者タグ（村人なら「村人「」」、
    // 長老なら「長老「」」）も地の文の「村人」「長老」も、すべて実際に付けた名前に
    // 書き換える（replaceUnnamedPlaceholder参照）。exit/bossにはnpcNamesが関係しないので、
    // ここで先に共通計算しておき、grantsItem・通常会話の両方から使えるようにする
    const isNameableNpc = interactable.kind === "npc" && isNameableCharacter(interactable.id);
    const npcName = isNameableNpc ? state.npcNames[interactable.id] : undefined;
    const namedPortraits = npcName
      ? portraits?.map((p) => (UNNAMED_PLACEHOLDER_NAMES.includes(p.name) ? { ...p, name: npcName } : p))
      : portraits;
    // 「なまえ」を覚えた後、村人にまだ名前を決めていない場合、名づけるかどうかを
    // 聞く（1体につき1回だけ。決めたらnpcNamesに固定で入る）
    const shouldAskNpcName =
      isNameableNpc &&
      state.wordsLearned.includes(NAME_UNLOCK_WORD_KANA) &&
      !(interactable.id in state.npcNames);
    // shouldAskNpcNameのときだけ、直前の会話の最後にコトの一言をはさんでから
    // 名づけモーダルを開く。grantsItem・通常会話の両方のonComplete末尾から呼ぶ
    const askNpcNameIfNeeded = () => {
      if (!shouldAskNpcName) return;

      setDialogue({
        lines: [
          interactable.id === "house-elder"
            ? "コト「そういえば、長老の名前、まだ知らなかったね。」"
            : "コト「そういえば、この子にまだ名前をつけてなかったね。」",
        ],
        portraits: namedPortraits,
        onComplete: () => {
          setDialogue(null);
          setNamingPrompt({ kind: "npc", id: interactable.id, portraits: namedPortraits });
        },
      });
    };

    if (interactable.kind === "exit") {
      const destination = interactable.exitsTo;
      // 村の門（town-exit-1〜3）だけが、必須の言葉3つを集めるまで通れない関門になる。
      // desertTown/fairyVillageからフィールドへ戻るときなど、他の"field"行き出口では
      // この制限はかからない（idで明確に区別している）
      const isTownGate = interactable.id.startsWith("town-exit-");

      // 村の外に出るには、まず出口の前にいる謎の少年（stranger）に話しかけておく
      // 必要がある。話しかけていなければ、コトが「怪しい」と言って足止めする
      if (isTownGate && !state.hasMetStranger) {
        setDialogue({
          lines: [
            "コト「待って。」",
            "コト「村の出口の前にいる、あの少年……とっても怪しいよ。」",
            "コト「外に出る前に、話しかけてみようよ。」",
          ],
          portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
          onComplete: () => setDialogue(null),
        });
        return;
      }

      // 村の外に出るには、最低限の言葉（はな以外で3つ）を集めておく必要がある。
      // まだ足りない場合はコトに止められて外に出られない
      if (isTownGate && countRequiredWordsLearned(state.wordsLearned) < BOSS_UNLOCK_WORD_COUNT) {
        setDialogue({
          lines: [
            "コト「待って！　まだ外に出るのは危ないよ。」",
            `コト「村の中でせめて${BOSS_UNLOCK_WORD_COUNT}つは言葉を見つけてから行こう。」`,
          ],
          portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
          onComplete: () => setDialogue(null),
        });
        return;
      }

      setDialogue({
        lines: interactable.dialogue ?? ["移動した。"],
        portraits,
        onComplete: () => {
          setDialogue(null);

          if (destination === "field") update({ scene: "field", playerPos: FIELD_START });
          else if (destination === "town") update({ scene: "town", playerPos: TOWN_REENTRY_POS });
          else if (destination === "desertTown") update({ scene: "desertTown", playerPos: DESERT_TOWN_MAP.start });
          else if (destination === "fairyVillage") update({ scene: "fairyVillage", playerPos: FAIRY_VILLAGE_MAP.start });
        },
      });
      return;
    }

    if (interactable.kind === "boss") {
      // 通常はfieldInteractables側でbossDefeated後にFIELD_BOSS_IDSを除外しているので
      // ここに来ることは無いはずだが、念のための二重の安全装置。これが無いと、
      // 何らかの理由でボスの当たり判定が残っていた場合に何度でも再戦できてしまう
      if (state.bossDefeated) return;

      // ボーナスの言葉（ねこ・いぬなど）を含めた合計数ではなく、必須の言葉
      // （みず・ひ・かぜ）を何個覚えたかで判定する
      const requiredLearnedCount = countRequiredWordsLearned(state.wordsLearned);

      if (requiredLearnedCount < BOSS_UNLOCK_WORD_COUNT) {
        setDialogue({
          lines: interactable.dialogue ?? [],
          portraits,
          onComplete: () => setDialogue(null),
        });
        return;
      }

      // コトによるバトルのチュートリアルは、キングスライム戦かどうかではなく
      // 「まだ一度も戦闘をしていないか」で出し分ける（雑魚戦が先でもボス戦が先でも、
      // 最初の戦闘でだけ&tutorial=1を付ける）
      const isFirstBattle = !state.hasHadFirstBattle;
      if (isFirstBattle) update({ hasHadFirstBattle: true });

      const words = encodeURIComponent(state.wordsLearned.join(","));
      const params =
        `mode=story&chapter=1&encounter=boss&words=${words}` +
        (isFirstBattle ? "&tutorial=1" : "") +
        `&attackBooks=${state.attackBooks}&defenseBooks=${state.defenseBooks}` +
        `&hp=${state.playerHp}&maxHp=${state.maxPlayerHp}`;

      router.push(`/battle?${params}`);
      return;
    }

    // 樽・宝箱の場合（攻撃力の書・防御力の書・体力の書・ポーションのいずれかを手に入れる）。
    // wanderer-potionのようにkind:"npc"のものもあるので、こちらも名づけ対象になり得る
    if (interactable.grantsItem) {
      const alreadyOpened = state.chestsOpened.includes(interactable.id);
      const count = interactable.grantsItemCount ?? 1;
      const itemMeta = {
        attack: { label: "攻撃力の書", emoji: "📕", extra: "ボス戦のときに使えそうだよ。" },
        defense: { label: "防御力の書", emoji: "📗", extra: "ボス戦のときに使えそうだよ。" },
        hp: { label: "体力の書", emoji: "📘", extra: "持ち物から使うと、さいだいHPが上がって全回復するよ。" },
        potion: { label: "ポーション", emoji: "🧪", extra: "持ち物から使うとHPが少し回復するよ。" },
        map: {
          label: "世界の地図",
          emoji: "🗺️",
          extra: "メニューの《フィールドマップ》から、いつでも見られるようになるよ。黄色く光る場所が、次に目指す場所の目印だよ！",
        },
      }[interactable.grantsItem];
      const countText = count > 1 ? `が${count}個も` : "が";
      const rawDialogue = interactable.dialogue ?? [];
      const baseLines = npcName ? rawDialogue.map((line) => replaceUnnamedPlaceholder(line, npcName)) : rawDialogue;
      const lines = alreadyOpened
        ? [...baseLines, "コト「あれ、もう空っぽみたい。」"]
        : [...baseLines, `コト「${itemMeta.emoji}『${itemMeta.label}』${countText}入ってる！ ${itemMeta.extra}」`];

      setDialogue({
        lines,
        title: npcName,
        portraits: namedPortraits,
        onComplete: () => {
          setDialogue(null);

          if (!alreadyOpened) openChest(interactable.id, interactable.grantsItem!, count);

          askNpcNameIfNeeded();
        },
      });
      return;
    }

    // 村人・置物（井戸など）の場合
    const teaches = interactable.teachesWord;
    const alreadyLearned = teaches ? state.wordsLearned.includes(teaches.kana) : false;

    // 名づけ済みの村人は、セリフの「村人「」」という話者タグも地の文の「村人」も、
    // すべて実際に付けた名前に書き換える（TOWN_WANDERERS由来のセリフがこの書き方。
    // house-elderのようにそもそも「村人」と言わないセリフには影響しない）
    const rawDialogue = interactable.dialogue ?? [];
    const baseLines = npcName ? rawDialogue.map((line) => replaceUnnamedPlaceholder(line, npcName)) : rawDialogue;
    const lines =
      teaches && !alreadyLearned
        ? [...baseLines, `『${teaches.kanji}（${teaches.kana}）』を おぼえた！`]
        : baseLines;

    // 花壇で「はな」を初めて覚えた直後だけ、コトが名前を聞いてくる
    // （プレイヤー自身の名づけイベント。もう決めてある場合は聞き直さない）
    const isFirstFlowerLearn = teaches?.kana === TUTORIAL_TARGET_KANA && !alreadyLearned;
    const shouldAskPlayerName = isFirstFlowerLearn && !state.playerName;

    setDialogue({
      lines,
      title: npcName,
      portraits: namedPortraits,
      onComplete: () => {
        setDialogue(null);

        if (teaches) learnWord(teaches.kana);

        // 村の出口の前にいる謎の少年に話しかけた記録（村を出るための関門解除）
        if (interactable.id === "stranger" && !state.hasMetStranger) update({ hasMetStranger: true });

        if (shouldAskPlayerName) {
          setDialogue({
            lines: ["コト「そういえば、あなたの名前はなんていうの？」"],
            portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
            onComplete: () => {
              setDialogue(null);
              setNamingPrompt({ kind: "player", portraits: [PLAYER_PORTRAIT, KOTO_RIGHT] });
            },
          });
          return;
        }

        askNpcNameIfNeeded();
      },
    });
  };

  // プレイヤー・村人を通じて、まだ誰にも使われていない名前をランダムで1つ選ぶ
  const pickRandomName = () => {
    const usedNames = [...Object.values(state.npcNames), state.playerName].filter(Boolean);
    const unusedNames = RANDOM_NAME_POOL.filter((candidate) => !usedNames.includes(candidate));
    const namePool = unusedNames.length > 0 ? unusedNames : RANDOM_NAME_POOL;

    return namePool[Math.floor(Math.random() * namePool.length)];
  };

  // 村人に名前を付け終えた結果、NAMEABLE_NPC_IDS全員分がnpcNamesに揃ったかどうかを
  // 判定する。揃った瞬間だけtrueを返し、以後は（npcNamesが減ることは無いので）
  // 呼ばれないが、念のためstate.bridgeBuiltが既にtrueなら二重に演出しないようにする
  const finalizeNpcName = (npcId: string, assignedName: string) => {
    if (state.bridgeBuilt) {
      update({ npcNames: { ...state.npcNames, [npcId]: assignedName } });
      return false;
    }

    const nextNpcNames = { ...state.npcNames, [npcId]: assignedName };

    update({ npcNames: nextNpcNames });

    return NAMEABLE_NPC_IDS.every((id) => id in nextNpcNames);
  };

  // 名づけミッションを完了した瞬間だけ呼ぶ、橋が架かる演出
  const showBridgeAppearedDialogue = () => {
    update({ bridgeBuilt: true });
    setDialogue({
      lines: [
        "長老に、名前をつけ終えた――その瞬間。",
        "遠くから、地鳴りのような低い音が響いてきた。",
        "コト「見て、あそこ……！」",
        "コト「言霊の力で、海に橋が架かったんだよ！」",
        "コト「長老に名前をつけてくれたおかげだね。次の場所へ渡れるようになったよ！」",
      ],
      portraits: [PLAYER_PORTRAIT, KOTO_RIGHT],
      onComplete: () => setDialogue(null),
    });
  };

  // NamingModalの送信を受け取る。nameがnullなのは「このままにする（名づけない）」選択
  // （ランダムな名前を割り当てる）。名づけた場合は、最初の1文字を言いよどんでから
  // 名前を続ける「は、、、、はな」のような照れ隠しのセリフをその場で1行はさむ
  // （この世界の人たちは言葉の力を失って「う、う……」としか喋れないので、名前だけは
  // 初めて自分の声で言えた、という演出のつもり）
  const handleNamingSubmit = (name: string | null) => {
    if (!namingPrompt) return;

    const prompt = namingPrompt;
    setNamingPrompt(null);

    if (name) {
      const missionJustCompleted = prompt.kind === "player" ? false : finalizeNpcName(prompt.id, name);
      if (prompt.kind === "player") update({ playerName: name });

      const speakerName = prompt.kind === "player" ? "主人公" : name;
      const stutter = `${name.charAt(0)}、、、、${name}`;
      const speakingPortraits = prompt.portraits?.map((p) => (UNNAMED_PLACEHOLDER_NAMES.includes(p.name) ? { ...p, name } : p));

      setDialogue({
        lines: [`${speakerName}「${stutter}」`],
        portraits: speakingPortraits,
        onComplete: () => {
          setDialogue(null);
          if (missionJustCompleted) showBridgeAppearedDialogue();
        },
      });
      return;
    }

    const randomName = pickRandomName();
    const missionJustCompleted = prompt.kind === "player" ? false : finalizeNpcName(prompt.id, randomName);
    if (prompt.kind === "player") update({ playerName: randomName });

    setDialogue({
      lines: [`コト「じゃあ、${randomName}って呼ぼうよ！」`],
      portraits: prompt.portraits ?? [PLAYER_PORTRAIT, KOTO_RIGHT],
      onComplete: () => {
        setDialogue(null);
        if (missionJustCompleted) showBridgeAppearedDialogue();
      },
    });
  };

  const handleFieldStep = (pos: { x: number; y: number }) => {
    update({ playerPos: pos });

    stepsSinceBattleRef.current += 1;

    // 前回の戦闘からSAFE_STEPS_AFTER_BATTLE歩は必ず歩けるようにする
    // （戦闘直後にまたすぐ襲われるとテンポが悪い、という指摘への対応）
    if (stepsSinceBattleRef.current < SAFE_STEPS_AFTER_BATTLE) return;

    if (Math.random() < ENCOUNTER_CHANCE_PER_STEP) {
      stepsSinceBattleRef.current = 0;

      // コトによるバトルのチュートリアルは、最初の戦闘でだけ出す
      // （ボス戦のkind:"boss"分岐と同じ判定。StoryGame.tsxのhandleBump参照）
      const isFirstBattle = !state.hasHadFirstBattle;
      if (isFirstBattle) update({ hasHadFirstBattle: true });

      // フィールドの雑魚戦にも、ボス戦と同じく「見つけた（覚えた）言葉」とHPを渡す。
      // ゾーン別モンスター出現：橋を渡ったx座標（本土側）で戦闘になった場合だけ、
      // battle/page.tsx側でゴブリンも混じった雑魚プールを使わせる
      const zone = pos.x < FIELD_MAINLAND_BOUNDARY_X ? "mainland" : "island";
      const words = encodeURIComponent(state.wordsLearned.join(","));
      const params =
        `mode=story&chapter=1&encounter=field&words=${words}&zone=${zone}` +
        (isFirstBattle ? "&tutorial=1" : "") +
        `&hp=${state.playerHp}&maxHp=${state.maxPlayerHp}`;

      router.push(`/battle?${params}`);
    }
  };

  if (showTitle) {
    return (
      <TitleScreen
        onNewGame={() => {
          handleEnterChapter1();
          dismissTitle();
        }}
        onSelectSlot={(id) => {
          loadFromSlot(id);
          dismissTitle();
        }}
      />
    );
  }

  if (state.scene === "prologue") {
    return (
      // 背景画像を用意でき次第、このdivの中に <Image src="..." fill className="object-cover" /> を
      // 追加すればよい（今はbg-slate-900の単色のまま）
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <Button
          onClick={() => setShowTitle(true)}
          className="fixed top-6 right-10 z-50"
        >
          🏠 タイトルに戻る
        </Button>
        <StoryDialogue
          open
          title="プロローグ"
          lines={PROLOGUE_LINES}
          backgrounds={PROLOGUE_BACKGROUNDS}
          onComplete={() => update({ scene: "intro" })}
        />
      </div>
    );
  }

  if (state.scene === "intro") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <Button
          onClick={() => setShowTitle(true)}
          className="fixed top-6 right-10 z-50"
        >
          🏠 タイトルに戻る
        </Button>
        <StoryDialogue
          open
          lines={DREAM_LINES}
          portraits={[DREAM_STRANGER_PORTRAIT]}
          backgrounds={DREAM_BACKGROUNDS}
          onComplete={() => update({ scene: "elderVisit" })}
        />
      </div>
    );
  }

  if (state.scene === "elderVisit") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <Button
          onClick={() => setShowTitle(true)}
          className="fixed top-6 right-10 z-50"
        >
          🏠 タイトルに戻る
        </Button>
        <StoryDialogue
          open
          lines={ELDER_VISIT_LINES}
          backgrounds={ELDER_VISIT_BACKGROUNDS}
          portraits={[PLAYER_PORTRAIT, ELDER_RIGHT]}
          onComplete={() => update({ scene: "meetKoto" })}
        />
      </div>
    );
  }

  if (state.scene === "meetKoto") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <Button
          onClick={() => setShowTitle(true)}
          className="fixed top-6 right-10 z-50"
        >
          🏠 タイトルに戻る
        </Button>
        <StoryDialogue
          open
          lines={MEET_KOTO_LINES}
          portraits={[PLAYER_PORTRAIT, KOTO_RIGHT]}
          backgrounds={MEET_KOTO_BACKGROUNDS}
          onComplete={() => update({ scene: "town", playerPos: TUTORIAL_START_POS })}
        />
      </div>
    );
  }

  if (state.scene === "ending") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <StoryDialogue
          open
          title="エンディング"
          lines={ENDING_LINES}
          onComplete={() => update({ scene: "field", playerPos: FIELD_START })}
        />
      </div>
    );
  }

  const isTown = state.scene === "town";
  const isDesertTown = state.scene === "desertTown";
  const isFairyVillage = state.scene === "fairyVillage";
  // 安全なエリア（村・砂漠の町・妖精の里）かどうか。フィールド（野外）だけ
  // ランダムエンカウントが起きる（下のonStepOntoFloor参照）
  const isSafeArea = isTown || isDesertTown || isFairyVillage;

  const map = isTown ? TOWN_MAP : isDesertTown ? DESERT_TOWN_MAP : isFairyVillage ? FAIRY_VILLAGE_MAP : fieldMap;
  // 「ちからもち」を覚えていたら、フィールドの岩どかしパズル（FIELD_STRENGTH_PUZZLE）
  // の岩をinteractablesから除外する。GridExplorer.tsxはinteractablesに無いマスは
  // ただの床として扱うので、これだけで「岩が消えて奥まで歩ける」演出になる
  // （岩のデータやhandleBump自体は変えていない。除外するかどうかをここで動的に決めるだけ）
  // ボスを倒した後は、フィールド上のキングスライム（FIELD_BOSS）も消しておく
  // （倒したはずのボスがフィールドに居残って再度ぶつかれてしまう不具合の修正）
  const fieldInteractables = FIELD_INTERACTABLES.filter((i) => {
    if (i.id === FIELD_STRENGTH_PUZZLE_ROCK_ID && state.wordsLearned.includes(FIELD_STRENGTH_PUZZLE_WORD)) return false;
    if (FIELD_BOSS_IDS.includes(i.id) && state.bossDefeated) return false;
    return true;
  });
  // ボスを倒すと、村の出口の前にいた謎の少年（stranger）は村からいなくなる
  // （役目を終えたキャラクターなので、以後は二度と話しかけられない）。
  // 同時に、長老の家（house-elder）もHOUSE_ELDER_POST_BOSSに差し替わり、
  // 長老が実際にそこにいて世界の地図をくれる＝名づけられるようになる
  const townInteractables = state.bossDefeated
    ? TOWN_INTERACTABLES.filter((i) => i.id !== "stranger").map((i) =>
        i.id === "house-elder" ? HOUSE_ELDER_POST_BOSS : i
      )
    : TOWN_INTERACTABLES;

  const interactables = isTown
    ? [...townInteractables, ...wanderers]
    : isDesertTown
    ? DESERT_TOWN_INTERACTABLES
    : isFairyVillage
    ? FAIRY_VILLAGE_INTERACTABLES
    : fieldInteractables;
  const objects = isTown ? TOWN_OBJECTS : isDesertTown ? DESERT_TOWN_OBJECTS : isFairyVillage ? FAIRY_VILLAGE_OBJECTS : fieldObjects;
  const tileSize = isTown
    ? TOWN_TILE_SIZE
    : isDesertTown
    ? DESERT_TOWN_TILE_SIZE
    : isFairyVillage
    ? FAIRY_VILLAGE_TILE_SIZE
    : FIELD_TILE_SIZE;
  const floorTextures = isTown
    ? TOWN_FLOOR_TEXTURES
    : isDesertTown
    ? DESERT_TOWN_FLOOR_TEXTURES
    : isFairyVillage
    ? FAIRY_VILLAGE_FLOOR_TEXTURES
    : FIELD_FLOOR_TEXTURES;
  const sceneLabel = isTown
    ? "はじまりの村"
    : isDesertTown
    ? "砂漠の町"
    : isFairyVillage
    ? "妖精の里"
    : "はじまりの村・外の草原";
  // 表示用。ねこ・いぬなどのボーナスの言葉は含めず、ボス解放に必要な言葉だけを数える
  const requiredLearnedCount = countRequiredWordsLearned(state.wordsLearned);

  return (
    <div className="relative w-screen h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <HomeButton />

      {/*
        途中でタイトルに戻りたいときのためのボタン。押すとタイトル画面（はじめから／
        つづきから）が表示される。stateはそのままなので、つづきからを選べば
        今と同じ場所に戻ってこられる（showTitleはセッション内だけのローカルな表示
        フラグで、セーブ内容自体には影響しない）
      */}
      <Button
        onClick={() => setShowTitle(true)}
        className="fixed top-6 right-10 z-50"
      >
        🏠 タイトルに戻る
      </Button>

      {/* 言霊の書・言葉の図鑑・持ち物・ステータスをまとめて開くボタン */}
      <Button
        onClick={() => setShowMenu(true)}
        className="fixed top-20 left-10 z-50"
      >
        📖 メニュー
      </Button>

      {/*
        修正済み：手動セーブは独立したボタン・オーバーレイではなく、メニューの
        「言霊の書」タブに統合した（KotodamaBook.tsx参照。「記録する」を押すと
        セーブ1〜3のどこに記録するか選べる）
      */}

      <Menu
        open={showMenu}
        onOpenChange={setShowMenu}
        journalEntries={state.journalEntries}
        onSave={handleSaveJournal}
        wordDictionary={CHAPTER1_WORD_DICTIONARY}
        wordsLearned={state.wordsLearned}
        attackBooks={state.attackBooks}
        defenseBooks={state.defenseBooks}
        hpBooks={state.hpBooks}
        potions={state.potions}
        onUseHpBook={useHpBook}
        onUsePotion={usePotion}
        playerHp={state.playerHp}
        maxPlayerHp={state.maxPlayerHp}
        requiredLearnedCount={requiredLearnedCount}
        bossUnlockWordCount={BOSS_UNLOCK_WORD_COUNT}
        slotSummaries={getAllSlotSummaries()}
        onSaveToSlot={saveToSlot}
        hasFieldMap={state.chestsOpened.includes("house-elder")}
        fieldFloorTextures={FIELD_FLOOR_TEXTURES}
        fieldObjects={fieldObjects}
        fieldPlayerPos={state.scene === "field" ? state.playerPos : null}
        fieldObjective={getFieldObjective(state)}
      />

      <p className="text-white text-sm">
        {sceneLabel} ｜ HP：{state.playerHp}/{state.maxPlayerHp}
      </p>

      {/*
        村は1マスが小さい（TOWN_TILE_SIZE=48。フィールドのFIELD_TILE_SIZE=80より小さい）ぶん
        同じ画面サイズでも表示されるマス数が多く、描画が重くなりがちだった。村だけ表示範囲
        （viewportWidth/Height）を少し狭くして、描画するマス数を減らしている
      */}
      <GridExplorer
        map={map}
        interactables={interactables}
        objects={objects}
        playerPos={state.playerPos}
        onMove={(pos) => update({ playerPos: pos })}
        onBump={handleBump}
        onStepOntoFloor={isSafeArea ? undefined : handleFieldStep}
        isLocked={dialogue !== null || showMenu || namingPrompt !== null}
        tileSize={tileSize}
        floorTextures={floorTextures}
        viewportWidth={isTown ? TOWN_VIEWPORT_WIDTH : undefined}
        viewportHeight={isTown ? TOWN_VIEWPORT_HEIGHT : undefined}
      />

      <p className="text-white/60 text-xs">
        矢印キーで移動 ｜ gキーでマス目のデバッグ表示（当たり判定の確認用）
      </p>

      {dialogue && (
        <StoryDialogue
          open
          lines={dialogue.lines}
          title={dialogue.title}
          portraits={dialogue.portraits}
          onComplete={dialogue.onComplete}
        />
      )}

      <NamingModal
        open={namingPrompt !== null}
        message={
          namingPrompt?.kind === "player"
            ? "自分の名前をつける？\nつけない場合は、ランダムな名前になるよ。"
            : namingPrompt?.id === "house-elder"
            ? "長老に名前をつける？\nつけない場合は、ランダムな名前になるよ。"
            : "この子に名前をつける？\nつけない場合は、ランダムな名前になるよ。"
        }
        onSubmit={handleNamingSubmit}
      />
    </div>
  );
}
