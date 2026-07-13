"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GridExplorer } from "./GridExplorer";
import { StoryDialogue } from "./StoryDialogue";
import { ChapterSelect } from "./ChapterSelect";
import { Menu } from "./Menu";
import { useStoryState, readAndClearStoryBattleResult, DEFAULT_MAX_HP, type Chapter1State } from "./useStoryState";
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
  FIELD_MAP,
  FIELD_TILE_SIZE,
  FIELD_FLOOR_TEXTURES,
  FIELD_OBJECTS,
  FIELD_INTERACTABLES,
  BOSS_UNLOCK_WORD_COUNT,
  CHAPTER1_WORD_DICTIONARY,
  CHAPTER1_REQUIRED_WORDS,
  TUTORIAL_START_POS,
} from "./chapter1Data";
import type { DialoguePortrait, Interactable } from "./types";

// 敵が多すぎるという指摘を受けて0.15から引き下げた。さらに、戦闘から戻った直後に
// また即エンカウントするとテンポが悪いので、SAFE_STEPS_AFTER_BATTLEぶんは必ず
// 歩けるようにしている（stepsSinceBattleRef参照）
const ENCOUNTER_CHANCE_PER_STEP = 0.08;
const SAFE_STEPS_AFTER_BATTLE = 6;

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

const ENDING_LINES = [
  "スライムキングをたおした。",
  "『ゆうき』という言霊を思い出した。",
  "――夢の中、幼い自分が誰かたちと笑っている。",
  "けれど、顔だけがどうしても思い出せない。",
  "第1章 クリア！",
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
// 長老の家（house-elder）は、長老がその場にいないのに壁越しに喋るのは不自然なので
// 長老自身のセリフ・立ち絵は無し。ただし白紙の本を見つけてコトと話す場面はあるので、
// 主人公・コトの立ち絵は出す（長老の姿はELDER_VISIT_LINESの場面でのみ見せる）
function getPortraitsForInteractable(interactable: Interactable): DialoguePortrait[] | undefined {
  if (interactable.grantsItem) return [PLAYER_PORTRAIT, KOTO_RIGHT];

  if (interactable.id === "house-elder") {
    return [PLAYER_PORTRAIT, KOTO_RIGHT];
  }

  if (interactable.id === "stranger") {
    return [PLAYER_PORTRAIT, { side: "right", name: "謎の青年", image: STRANGER_PORTRAIT_IMAGE }];
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

  if (
    interactable.id === "well" ||
    interactable.id === "tree-word" ||
    interactable.id === "flower-word" ||
    interactable.id === "grass-word"
  ) {
    return [KOTO_LEFT];
  }

  // 洞窟でコトが直接止めてくれる場面。主人公・コトの2人での会話にする
  if (interactable.id === "cave" || interactable.id === "forest-entrance" || interactable.id === "snow-mountain-view") {
    return [PLAYER_PORTRAIT, KOTO_RIGHT];
  }

  return undefined;
}

// 覚えた言葉のうち、ボス解放に必要な言葉（みず・ひ・かぜ）を何個覚えたか。
// ボス解放・村を出る条件の両方でこの数を使う
function countRequiredWordsLearned(wordsLearned: string[]): number {
  return CHAPTER1_REQUIRED_WORDS.filter((kana) => wordsLearned.includes(kana)).length;
}

export function StoryGame() {
  const router = useRouter();
  const { state, update, learnWord, openChest, useHpBook, usePotion, addJournalEntry } = useStoryState();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [showMenu, setShowMenu] = useState(false);
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
      learnWord("ゆうき");
      update({ ...patch, scene: "ending", bossDefeated: true });
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
    if (state.scene !== "town" && state.scene !== "field") return;

    const map = state.scene === "town" ? TOWN_MAP : FIELD_MAP;
    const { x, y } = state.playerPos;
    const tile = map.tiles[y]?.[x];

    if (tile !== "floor") {
      update({ playerPos: map.start });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scene, state.playerPos.x, state.playerPos.y]);

  const handleEnterChapter1 = () => {
    update({
      scene: "prologue",
      playerPos: TOWN_MAP.start,
      wordsLearned: [],
      bossDefeated: false,
      chestsOpened: [],
      attackBooks: 0,
      defenseBooks: 0,
      hpBooks: 0,
      potions: 0,
      journalEntries: [],
      playerHp: DEFAULT_MAX_HP,
      maxPlayerHp: DEFAULT_MAX_HP,
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

    if (interactable.kind === "exit") {
      const destination = interactable.exitsTo;

      // 村の外（フィールド）に出るには、最低限の言葉（みず・ひ・かぜ）を
      // 集めておく必要がある。まだ足りない場合はコトに止められて外に出られない
      // （ボスに挑めるようになる条件と同じ数を流用している）
      if (destination === "field" && countRequiredWordsLearned(state.wordsLearned) < BOSS_UNLOCK_WORD_COUNT) {
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

          if (destination === "field") {
            update({ scene: "field", playerPos: FIELD_MAP.start });
          } else if (destination === "town") {
            update({ scene: "town", playerPos: TOWN_REENTRY_POS });
          }
        },
      });
      return;
    }

    if (interactable.kind === "boss") {
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

      const words = encodeURIComponent(state.wordsLearned.join(","));
      const params =
        `mode=story&chapter=1&encounter=boss&words=${words}` +
        `&attackBooks=${state.attackBooks}&defenseBooks=${state.defenseBooks}` +
        `&hp=${state.playerHp}&maxHp=${state.maxPlayerHp}`;

      router.push(`/battle?${params}`);
      return;
    }

    // 樽の場合（攻撃力の書・防御力の書・体力の書のいずれかを手に入れる）
    if (interactable.grantsItem) {
      const alreadyOpened = state.chestsOpened.includes(interactable.id);
      const itemMeta = {
        attack: { label: "攻撃力の書", emoji: "📕", extra: "ボス戦のときに使えそうだよ。" },
        defense: { label: "防御力の書", emoji: "📗", extra: "ボス戦のときに使えそうだよ。" },
        hp: { label: "体力の書", emoji: "📘", extra: "持ち物から使うと、さいだいHPが上がって全回復するよ。" },
        potion: { label: "ポーション", emoji: "🧪", extra: "持ち物から使うとHPが少し回復するよ。" },
      }[interactable.grantsItem];
      const baseLines = interactable.dialogue ?? [];
      const lines = alreadyOpened
        ? [...baseLines, "コト「あれ、もう空っぽみたい。」"]
        : [...baseLines, `コト「${itemMeta.emoji}『${itemMeta.label}』が入ってる！ ${itemMeta.extra}」`];

      setDialogue({
        lines,
        portraits,
        onComplete: () => {
          setDialogue(null);

          if (!alreadyOpened) openChest(interactable.id, interactable.grantsItem!);
        },
      });
      return;
    }

    // 村人・置物（井戸など）の場合
    const teaches = interactable.teachesWord;
    const alreadyLearned = teaches ? state.wordsLearned.includes(teaches.kana) : false;
    const baseLines = interactable.dialogue ?? [];
    const lines =
      teaches && !alreadyLearned
        ? [...baseLines, `『${teaches.kanji}（${teaches.kana}）』を おぼえた！`]
        : baseLines;

    setDialogue({
      lines,
      portraits,
      onComplete: () => {
        setDialogue(null);

        if (teaches) learnWord(teaches.kana);
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

      // フィールドの雑魚戦にも、ボス戦と同じく「見つけた（覚えた）言葉」とHPを渡す
      const words = encodeURIComponent(state.wordsLearned.join(","));
      const params =
        `mode=story&chapter=1&encounter=field&words=${words}` +
        `&hp=${state.playerHp}&maxHp=${state.maxPlayerHp}`;

      router.push(`/battle?${params}`);
    }
  };

  if (state.scene === "select") {
    return (
      <ChapterSelect
        chapter1Complete={state.bossDefeated}
        onEnterChapter1={handleEnterChapter1}
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
          onClick={() => update({ scene: "select" })}
          className="fixed top-6 right-10 z-50"
        >
          📖 章選択に戻る
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
          onClick={() => update({ scene: "select" })}
          className="fixed top-6 right-10 z-50"
        >
          📖 章選択に戻る
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
          onClick={() => update({ scene: "select" })}
          className="fixed top-6 right-10 z-50"
        >
          📖 章選択に戻る
        </Button>
        <StoryDialogue
          open
          lines={ELDER_VISIT_LINES}
          backgrounds={ELDER_VISIT_BACKGROUNDS}
          portraits={[PLAYER_PORTRAIT, { side: "right", name: "長老", image: ELDER_PORTRAIT_IMAGE }]}
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
          onClick={() => update({ scene: "select" })}
          className="fixed top-6 right-10 z-50"
        >
          📖 章選択に戻る
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
          onComplete={() => update({ scene: "select" })}
        />
      </div>
    );
  }

  const isTown = state.scene === "town";
  const map = isTown ? TOWN_MAP : FIELD_MAP;
  const interactables = isTown ? [...TOWN_INTERACTABLES, ...wanderers] : FIELD_INTERACTABLES;
  // 表示用。ねこ・いぬなどのボーナスの言葉は含めず、ボス解放に必要な言葉だけを数える
  const requiredLearnedCount = countRequiredWordsLearned(state.wordsLearned);

  return (
    <div className="relative w-screen h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <HomeButton />

      {/* 途中で章選択に戻りたいときのためのボタン。押すと確認なしで即座に章選択画面へ戻る */}
      <Button
        onClick={() => update({ scene: "select" })}
        className="fixed top-6 right-10 z-50"
      >
        📖 章選択に戻る
      </Button>

      {/* 言霊の書・言葉の図鑑・持ち物・ステータスをまとめて開くボタン */}
      <Button
        onClick={() => setShowMenu(true)}
        className="fixed top-20 left-10 z-50"
      >
        📖 メニュー
      </Button>

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
      />

      <p className="text-white text-sm">
        {isTown ? "はじまりの村" : "はじまりの村・外の草原"} ｜ おぼえた言葉：
        {requiredLearnedCount}/{BOSS_UNLOCK_WORD_COUNT} ｜ HP：{state.playerHp}/{state.maxPlayerHp}
      </p>

      <GridExplorer
        map={map}
        interactables={interactables}
        objects={isTown ? TOWN_OBJECTS : FIELD_OBJECTS}
        playerPos={state.playerPos}
        onMove={(pos) => update({ playerPos: pos })}
        onBump={handleBump}
        onStepOntoFloor={isTown ? undefined : handleFieldStep}
        isLocked={dialogue !== null || showMenu}
        tileSize={isTown ? TOWN_TILE_SIZE : FIELD_TILE_SIZE}
        floorTextures={isTown ? TOWN_FLOOR_TEXTURES : FIELD_FLOOR_TEXTURES}
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
    </div>
  );
}
