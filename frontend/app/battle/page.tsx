"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { HomeButton } from "@/components/HomeButton";

import {
  difficulty,
  type Difficulty,
  getMissPenaltyMultiplier,
  getEnemyCountForFloor,
  getEnemyAttackDamage,
  getCritChance,
  getWordPower,
  getWordSpeedForFloor,
  CRIT_DAMAGE_MULTIPLIER,
  MAGIC_DROP_CHANCE,
  FIRE_DAMAGE_MULTIPLIER,
  ICE_SLOW_WORD_COUNT,
  ICE_SLOW_SPEED_MULTIPLIER,
  pickWordForFloor,
  isBossFloor,
  BOSS_HP_MULTIPLIER,
  BOSS_SCORE_MULTIPLIER,
  BOSS_ATTACK_MULTIPLIER,
  ITEM_ATTACK_BONUS,
  ITEM_DEFENSE_BONUS,
  ITEM_DEFENSE_MULTIPLIER_MIN,
  ITEM_HP_BONUS,
} from "./difficulty";
import { words } from "./words";
import { enemies, storyEnemies } from "./enemy";
import { buildWordUnits, type WordUnit } from "./romaji";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/8bit/button";
import { CHAPTER1_FIELD_WORDS } from "../story/storyWords";
import { CHAPTER1_WORD_DICTIONARY } from "../story/chapter1Data";
import { writeStoryBattleResult } from "../story/useStoryState";
import { api } from "@/lib/api";

// 敵を倒したときに、まだ覚えていない言葉を低確率で見つけられる（アイテムと同じ
// ノリの言葉ドロップ）。「ゆうき」はボス撃破の専用報酬なのでドロップ対象からは除く
const WORD_DROP_CHANCE = 0.25;

// ストーリーモードの戦闘（フィールド雑魚・ボス共通）で使う設定。
// 試練の塔のdifficulty[diffKey]とは別枠で、必要なフィールドだけ持たせてある。
// 第1章「はじまりの村」のフィールドは草原なので、戦闘背景も草原にしてある
const STORY_CONFIG = {
  background: "/images/back-ground/story-field-battle.png",
  wordSpeed: 2,
  timeLimit: 60,
  enemyAttackDamage: 8,
};

// 演出の長さ(ms)
const ATTACK_LUNGE_MS = 200;
const HIT_FLASH_MS = 300;
const DEFEAT_FADE_MS = 500;
const MISS_FLASH_MS = 150;
const SCREEN_FLASH_MS = 350;
const GET_MESSAGE_MS = 1500;

// 単語を打ちきれず時間切れになった場合、ミスとして数える重み
const TIMEOUT_MISS_WEIGHT = 3;

// 会心率の上限（getCritChanceの上限と合わせる。コンボメーターの満タン基準にも使う）
const MAX_CRIT_CHANCE = 0.5;

// 敵を1体倒すごとに増える残り時間(秒)
const TIME_BONUS_PER_KILL = 5;
// 単語を1つ打ち切るごとに増える残り時間(秒)。時間切れ（打ち切れなかった）ときは
// 加算しない（自分の攻撃・防御どちらのフェーズでも共通）
const TIME_BONUS_PER_WORD = 1;

type Phase = "playerAttack" | "enemyAttack";

type MagicType = "fire" | "ice" | "lightning";

const MAGIC_TYPES: MagicType[] = ["fire", "ice", "lightning"];

const MAGIC_META: Record<
  MagicType,
  { label: string; emoji: string; wordColor: string; glow: string; damageColor: string }
> = {
  fire: {
    label: "炎",
    emoji: "🔥",
    wordColor: "text-red-500",
    glow: "rgba(255,80,0,0.85)",
    damageColor: "text-orange-500",
  },
  ice: {
    label: "氷",
    emoji: "❄️",
    wordColor: "text-cyan-300",
    glow: "rgba(80,200,255,0.85)",
    damageColor: "text-cyan-300",
  },
  lightning: {
    label: "雷",
    emoji: "⚡",
    wordColor: "text-violet-400",
    glow: "rgba(190,110,255,0.85)",
    damageColor: "text-violet-300",
  },
};

type ItemType = "attack" | "defense" | "hp" | "fireMagic" | "iceMagic" | "lightningMagic";

const ITEM_TYPES: ItemType[] = [
  "attack",
  "defense",
  "hp",
  "fireMagic",
  "iceMagic",
  "lightningMagic",
];

const ITEM_META: Record<ItemType, { label: string; emoji: string }> = {
  attack: { label: "攻撃力の書", emoji: "📕" },
  defense: { label: "防御力の書", emoji: "📗" },
  hp: { label: "体力の書", emoji: "📘" },
  fireMagic: { label: "炎魔法の書", emoji: "📙" },
  iceMagic: { label: "氷魔法の書", emoji: "📒" },
  lightningMagic: { label: "雷魔法の書", emoji: "📓" },
};

type ActiveEnemy = {
  uid: number;
  name: string;
  image: string;
  maxHp: number;
  hp: number;
  score: number;
  attackDamage: number;
  // 何ターンに1回攻撃してくるか（固定値）
  attackInterval: number;
  // 次の攻撃まで残り何ターンか（毎ターン減っていく）
  turnsUntilAttack: number;
  // 倒すと一定確率でこの魔法を落とす（落とさない場合はnull）
  dropsMagic: MagicType | null;
  // ボス階の敵かどうか（見た目・強さが変わる）
  isBoss: boolean;
};

type DamageText = {
  id: number;
  amount: number;
  target: "enemy" | "player";
  crit: boolean;
  magic: MagicType | null;
};

type GetMessage = {
  type: MagicType;
  text: string;
};

type TreasureMessage = {
  type: ItemType;
  text: string;
};

export default function BattlePage() {
  const searchParams = useSearchParams();

  const level = searchParams.get("level") || "easy";
  const mode = searchParams.get("mode") || "practice";
  const encounter = searchParams.get("encounter") || "";
  const learnedWords = searchParams.get("words") || "";
  // 村の門を通るときの、キングスライムとのチュートリアル戦かどうか
  // （StoryGame.tsxのtown-exitから&tutorial=1付きで飛んでくる）
  const isTutorial = searchParams.get("tutorial") === "1";
  // どの章のボスと戦っているか（StoryGame.tsxの&chapter=をそのまま受け取る）。
  // 勝った場合、この番号をそのままStoryBattleResultへ渡し、次の章へ進める材料にする
  const chapter = Number(searchParams.get("chapter") || "0") || undefined;
  // ストーリーモードで町の宝箱から手に入れた「攻撃力の書」「防御力の書」の数。
  // ボス戦にだけ、開始時点の強化として引き継がれる
  const attackBooks = Number(searchParams.get("attackBooks") || "0");
  const defenseBooks = Number(searchParams.get("defenseBooks") || "0");
  // ストーリーモードは、村での探索中に減ったHPをそのまま持ち越す
  // （試練の塔は毎回100/100からの独立した挑戦なので、指定が無ければ100/100になる）
  const initialHp = Number(searchParams.get("hp") || "100");
  const initialMaxHp = Number(searchParams.get("maxHp") || "100");

  // level/mode/encounterが変わるたびにkeyも変わるので、Reactはこのコンポーネントを
  // 使い回さず作り直す（＝floorやスコアなどのstateが確実にリセットされる）
  return (
    <BattleGame
      key={`${mode}-${encounter}-${level}`}
      level={level}
      mode={mode}
      encounter={encounter}
      learnedWords={learnedWords}
      attackBooks={attackBooks}
      defenseBooks={defenseBooks}
      initialHp={initialHp}
      initialMaxHp={initialMaxHp}
      isTutorial={isTutorial}
      chapter={chapter}
    />
  );
}

function BattleGame({
  level,
  mode,
  encounter,
  learnedWords,
  attackBooks,
  defenseBooks,
  initialHp,
  initialMaxHp,
  isTutorial,
  chapter,
}: {
  level: string;
  mode: string;
  encounter: string;
  learnedWords: string;
  attackBooks: number;
  defenseBooks: number;
  initialHp: number;
  initialMaxHp: number;
  isTutorial: boolean;
  chapter?: number;
}) {
  // ストーリーモード（試練の塔とは別の、章仕立ての戦闘）かどうか
  const isStory = mode === "story";
  const isBossEncounter = encounter === "boss";

  const diffKey: Difficulty =
    level === "normal" || level === "hard" ? level : "easy";

  const config = isStory ? STORY_CONFIG : difficulty[diffKey];

  const enemyList = isStory ? storyEnemies.chapter1 : enemies[diffKey];

  // wordListはuseEffectの依存配列に使われるので、毎レンダー新しい配列を作らないようメモ化する。
  // これは「自分の攻撃フェーズ」で出す単語のプール。フィールド戦・ボス戦とも、
  // 実際に村で見つけた（覚えた）言葉だけを出す。まだ何も覚えていない状態で
  // フィールドに出てしまった場合だけの保険として、その場合はCHAPTER1_FIELD_WORDS
  // （未習得でも出せる基本語彙）にフォールバックする
  const wordList = useMemo(() => {
    if (!isStory) return words[diffKey];

    const learnedKana = learnedWords ? learnedWords.split(",") : [];
    const learnedWordsAvailable = CHAPTER1_WORD_DICTIONARY.filter((w) =>
      learnedKana.includes(w.kana)
    );

    return learnedWordsAvailable.length > 0 ? learnedWordsAvailable : CHAPTER1_FIELD_WORDS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStory, isBossEncounter, learnedWords, diffKey]);

  // 敵の攻撃（防御フェーズ）で出す単語のプール。自分の攻撃フェーズとは別枠にして、
  // 敵は必ずしも自分が覚えた言葉ではない「見知らぬ言葉」をぶつけてくる、という
  // 演出にしている（試練の塔は元々1つのプールを共有するのでこの区別は無い）
  const enemyWordList = isStory ? CHAPTER1_FIELD_WORDS : wordList;

  // 階層と敵グループ
  const [floor, setFloor] = useState(1);
  const [activeEnemies, setActiveEnemies] = useState<ActiveEnemy[]>([]);
  // 階が変わるたびに、大きく表示する階層番号
  const [floorAnnounce, setFloorAnnounce] = useState<number | null>(null);
  // 宝箱を開いている間、次の階への切り替えをEnterが押されるまで保留しておく
  const [pendingNextFloor, setPendingNextFloor] = useState<number | null>(null);
  // ストーリーモードの戦闘（フィールド雑魚・ボス）に勝利し、Enterで/storyに戻るのを待っている状態
  const [storyBattleOver, setStoryBattleOver] = useState(false);
  // 勝利演出でこの戦闘中に見つけた言葉を一覧表示するためのスナップショット。
  // refの中身を描画中に直接読むとReactのlintルールに引っかかる（refはレンダーの
  // 外で読む前提のため）ので、勝利が決まった瞬間にstateへコピーしておく
  const [battleLearnedWordsSnapshot, setBattleLearnedWordsSnapshot] = useState<string[]>([]);

  // チュートリアル戦（isTutorial）でだけ使う、コトの説明ポップアップ。
  // Enterが押されるまでゲームを止める（treasureMessage等と同じ扱い。isPaused参照）。
  // attack（自分の攻撃＝白い文字の説明）とdefense（相手の攻撃＝黒い文字の説明）の
  // 2段階があり、それぞれ一度しか出さないのでshownRefで管理する
  const [tutorialMessage, setTutorialMessage] = useState<string[] | null>(null);
  const tutorialShownRef = useRef({ attack: false, defense: false });

  // ターン制の進行管理
  const [phase, setPhase] = useState<Phase>("playerAttack");
  // 敵の攻撃(防御)フェーズで、今ターン攻撃してくる敵の並び
  const [defenseQueue, setDefenseQueue] = useState<ActiveEnemy[]>([]);
  const [defenseIndex, setDefenseIndex] = useState(0);
  const [turnMissCount, setTurnMissCount] = useState(0);

  // ストーリーモードはinitialHp/initialMaxHpで村から持ち越したHPを引き継ぐ。
  // 試練の塔はisStoryがfalseなので常に100/100から始まる
  const [maxPlayerHp, setMaxPlayerHp] = useState(isStory ? initialMaxHp : 100);
  const [playerHp, setPlayerHp] = useState(isStory ? initialHp : 100);

  // 宝箱で強化される、攻撃力・被ダメージの倍率。
  // ストーリーモードのボス戦は、町の宝箱で集めたattackBooks/defenseBooksの数だけ
  // 最初から強化された状態で始まる（試練の塔の宝箱と同じ量ずつ効果がある）
  const [attackMultiplier, setAttackMultiplier] = useState(
    1 + attackBooks * ITEM_ATTACK_BONUS
  );
  const [defenseMultiplier, setDefenseMultiplier] = useState(
    Math.max(1 - defenseBooks * ITEM_DEFENSE_BONUS, ITEM_DEFENSE_MULTIPLIER_MIN)
  );
  // 宝箱でアイテムを手に入れたときに一瞬表示するメッセージ
  const [treasureMessage, setTreasureMessage] = useState<TreasureMessage | null>(null);

  const [score, setScore] = useState(0);

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // 残り時間（秒）。敵を倒すと増える
  const [timeLeft, setTimeLeft] = useState<number>(config.timeLimit);
  const [isGameOver, setIsGameOver] = useState(false);

  // 今出ている単語。kanaはローマ字判定用の読み、kanjiは画面中央に固定表示する見た目
  const [currentKana, setCurrentKana] = useState("");
  const [currentKanji, setCurrentKanji] = useState("");
  const [units, setUnits] = useState<WordUnit[]>([]);
  // 何ユニット目まで打ち終えたか
  const [unitIndex, setUnitIndex] = useState(0);
  // 今のユニットで、ここまで打ったローマ字
  const [unitProgress, setUnitProgress] = useState("");
  // 打ち終えたユニットが、実際にどのローマ字表記で確定したか（shi/si等の表示切り替え用）
  const [resolvedRomaji, setResolvedRomaji] = useState<string[]>([]);

  // 魔法（種類ごとの在庫）と、今出ている単語がどの魔法の単語か
  const [magicCounts, setMagicCounts] = useState<Record<MagicType, number>>({
    fire: 0,
    ice: 0,
    lightning: 0,
  });
  const [activeMagicType, setActiveMagicType] = useState<MagicType | null>(null);
  // 氷の魔法で、あと何単語ぶん流れる速度が遅くなっているか
  const [slowWordsRemaining, setSlowWordsRemaining] = useState(0);
  // 魔法をドロップしたときに一瞬表示するメッセージ
  const [getMessage, setGetMessage] = useState<GetMessage | null>(null);
  // 敵を倒して言葉を見つけたときに一瞬表示するメッセージ（ストーリーモードのみ）
  const [wordGetMessage, setWordGetMessage] = useState<string | null>(null);

  // ミス時に一瞬だけ次の文字を赤く光らせる
  const [missFlash, setMissFlash] = useState(false);

  const [wordX, setWordX] = useState(1000);

  // 演出用のstate
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  // 雷魔法で全体を殴ったときに、全ての敵に演出をつける
  const [aoeFlash, setAoeFlash] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  // 被弾した瞬間、画面全体を赤く光らせる
  const [screenFlash, setScreenFlash] = useState(false);
  const [defeatingUid, setDefeatingUid] = useState<number | null>(null);
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const damageIdRef = useRef(0);
  const enemyUidRef = useRef(0);
  // この戦闘中に言葉ドロップで見つけた言葉（kana）。writeStoryBattleResultで
  // 村側に持ち帰るために、勝敗が決まるまでここに貯めておく
  const battleLearnedWordsRef = useRef<string[]>([]);
  // ストーリーモードで「だんだん単語が強くなる」演出のためだけに使うターン数。
  // 試練の塔の階層(floor)の代わりに、単語を出した回数を疑似的な階層として使う
  // （ストーリーモードには階層の概念が無いため）
  const storyTurnCountRef = useRef(0);

  const isSlowed = slowWordsRemaining > 0;

  // phaseに応じて、自分の攻撃用（wordList）か敵の攻撃用（enemyWordList）かを
  // 切り替えて単語を選ぶ。ストーリーモードは、戦闘が進むほど（単語を出すほど）
  // 長く・強い単語が出やすくなるよう、pickWordForFloorの「階層」に疑似的な
  // カウントを渡している
  const pickWordForPhase = (phase: Phase) => {
    if (!isStory) return pickWordForFloor(wordList, floor, diffKey);

    storyTurnCountRef.current += 1;

    const pseudoFloor = 1 + Math.floor(storyTurnCountRef.current / 4);
    const pool = phase === "enemyAttack" ? enemyWordList : wordList;

    return pickWordForFloor(pool, pseudoFloor, diffKey);
  };

  const spawnFloorEnemies = (targetFloor: number): ActiveEnemy[] => {
    // ストーリーモードのボス戦は、章専用のボス1体だけを等身大のHPで出す
    // （試練の塔のBOSS_HP_MULTIPLIER等は適用しない）
    if (isStory && isBossEncounter) {
      const template = enemyList.boss[0];
      const image =
        template.images[Math.floor(Math.random() * template.images.length)];

      return [
        {
          uid: enemyUidRef.current++,
          name: template.name,
          image,
          maxHp: template.hp,
          hp: template.hp,
          score: template.score,
          attackDamage: config.enemyAttackDamage,
          attackInterval: template.attackInterval,
          turnsUntilAttack: template.attackInterval,
          dropsMagic: template.dropsMagic,
          isBoss: true,
        },
      ];
    }

    // 5階ごとはボス階。ボス専用の種族からランダムで1体だけ、強化されて出てくる
    if (isBossFloor(targetFloor)) {
      const bossPool = enemyList.boss;
      const template = bossPool[Math.floor(Math.random() * bossPool.length)];
      const image =
        template.images[Math.floor(Math.random() * template.images.length)];

      return [
        {
          uid: enemyUidRef.current++,
          name: template.name,
          image,
          maxHp: template.hp * BOSS_HP_MULTIPLIER,
          hp: template.hp * BOSS_HP_MULTIPLIER,
          score: template.score * BOSS_SCORE_MULTIPLIER,
          attackDamage: Math.round(
            getEnemyAttackDamage(config.enemyAttackDamage, targetFloor) *
              BOSS_ATTACK_MULTIPLIER
          ),
          attackInterval: template.attackInterval,
          turnsUntilAttack: template.attackInterval,
          dropsMagic: template.dropsMagic,
          isBoss: true,
        },
      ];
    }

    const count = getEnemyCountForFloor(targetFloor);
    const spawned: ActiveEnemy[] = [];
    const regularPool = enemyList.regular;

    for (let i = 0; i < count; i++) {
      const template =
        regularPool[Math.floor(Math.random() * regularPool.length)];
      const image =
        template.images[Math.floor(Math.random() * template.images.length)];

      spawned.push({
        uid: enemyUidRef.current++,
        name: template.name,
        image,
        maxHp: template.hp,
        hp: template.hp,
        score: template.score,
        attackDamage: getEnemyAttackDamage(config.enemyAttackDamage, targetFloor),
        attackInterval: template.attackInterval,
        // 湧いた直後は攻撃してこない。まずは自分のターンが一巡してから
        turnsUntilAttack: template.attackInterval,
        dropsMagic: template.dropsMagic,
        isBoss: false,
      });
    }

    return spawned;
  };

  const showDamage = (
    amount: number,
    target: "enemy" | "player",
    crit = false,
    magic: MagicType | null = null
  ) => {
    const id = damageIdRef.current++;

    setDamageTexts((prev) => [...prev, { id, amount, target, crit, magic }]);

    window.setTimeout(() => {
      setDamageTexts((prev) => prev.filter((d) => d.id !== id));
    }, 800);
  };

  const showMagicDrop = (enemyName: string, type: MagicType) => {
    setMagicCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    setGetMessage({
      type,
      text: `${enemyName}が${MAGIC_META[type].label}の魔法を落とした！`,
    });
    window.setTimeout(() => setGetMessage(null), GET_MESSAGE_MS);
  };

  // 敵を倒したときに低確率で、まだ覚えていない言葉を1つ見つける
  // （ストーリーモードのみ。試練の塔には言霊の概念が無いので何もしない）
  const tryDropWord = () => {
    if (!isStory) return;
    if (Math.random() >= WORD_DROP_CHANCE) return;

    const alreadyKnown = new Set([
      ...(learnedWords ? learnedWords.split(",") : []),
      ...battleLearnedWordsRef.current,
    ]);
    const candidates = CHAPTER1_WORD_DICTIONARY.filter(
      (w) => w.kana !== "ゆうき" && !alreadyKnown.has(w.kana)
    );

    if (candidates.length === 0) return;

    const word = candidates[Math.floor(Math.random() * candidates.length)];

    battleLearnedWordsRef.current.push(word.kana);
    setWordGetMessage(`新しい言霊『${word.kanji}（${word.kana}）』を見つけた！`);
    window.setTimeout(() => setWordGetMessage(null), GET_MESSAGE_MS);
  };

  // 階層が上がるたびに、宝箱から強化アイテムを1つもらう。
  // Enterが押されるまでゲーム全体を止めておく（wordX・残り時間のカウントダウンを一時停止）
  const grantTreasure = () => {
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    let text = "";

    switch (type) {
      case "attack":
        setAttackMultiplier((prev) => prev + ITEM_ATTACK_BONUS);
        text = "攻撃力が上がった！";
        break;
      case "defense":
        setDefenseMultiplier((prev) =>
          Math.max(prev - ITEM_DEFENSE_BONUS, ITEM_DEFENSE_MULTIPLIER_MIN)
        );
        text = "受けるダメージが減った！";
        break;
      case "hp":
        // さいだいHPを上げるだけでなく、そのままHPを新しいさいだい値まで全回復する
        setMaxPlayerHp((prev) => {
          const nextMax = prev + ITEM_HP_BONUS;

          setPlayerHp(nextMax);

          return nextMax;
        });
        text = "さいだいHPが上がって、全回復した！";
        break;
      case "fireMagic":
        setMagicCounts((prev) => ({ ...prev, fire: prev.fire + 1 }));
        text = "炎の魔法を手に入れた！";
        break;
      case "iceMagic":
        setMagicCounts((prev) => ({ ...prev, ice: prev.ice + 1 }));
        text = "氷の魔法を手に入れた！";
        break;
      case "lightningMagic":
        setMagicCounts((prev) => ({ ...prev, lightning: prev.lightning + 1 }));
        text = "雷の魔法を手に入れた！";
        break;
    }

    setTreasureMessage({ type, text });
  };

  // ゲーム開始時に1階の敵と最初の単語を用意する（最初は必ず自分の攻撃から）
  useEffect(() => {
    setActiveEnemies(spawnFloorEnemies(1));

    const word = pickWordForPhase("playerAttack");

    setCurrentKana(word.kana);
    setCurrentKanji(word.kanji);
    setUnits(buildWordUnits(word.kana));

    // チュートリアル戦は、単語が流れ始める前に「白い文字＝自分の攻撃」の説明を出す
    // （コンボ・文字数によるダメージ増加もここでまとめて説明する）
    if (isTutorial && !tutorialShownRef.current.attack) {
      tutorialShownRef.current.attack = true;
      setTutorialMessage([
        "コト「よし、いよいよキングスライムとの戦いだね！」",
        "コト「白い文字が出ている間は、あなたの攻撃のターンだよ。」",
        "コト「ローマ字を最後まで正確に打ち切ると、攻撃が発動するよ！」",
        "コト「文字数が多い言葉ほど、大きなダメージを与えられるんだ。」",
        "コト「ミスせず続けて打てると『コンボ』が貯まって、会心（クリティカル）が出やすくなるよ！」",
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordList]);

  // チュートリアル戦で、敵の攻撃（防御）フェーズに初めて入ったタイミングで
  // 「黒い文字＝相手の攻撃」の説明を1回だけ出す
  useEffect(() => {
    if (!isTutorial || phase !== "enemyAttack" || tutorialShownRef.current.defense) return;

    tutorialShownRef.current.defense = true;
    setTutorialMessage([
      "コト「危ない、キングスライムの攻撃が来るよ！」",
      "コト「黒い文字が出ているときは、相手の攻撃のターンだよ。」",
      "コト「今すぐ打ち切って防がないと、ダメージを受けちゃう！」",
    ]);
  }, [isTutorial, phase]);

  // 階層が変わるたびに、大きく表示してから消す
  useEffect(() => {
    setFloorAnnounce(floor);

    const timer = window.setTimeout(() => setFloorAnnounce(null), 1600);

    return () => window.clearTimeout(timer);
  }, [floor]);

  // 宝箱を開いている間・ストーリー戦闘の勝利演出中・チュートリアルの説明中は、
  // 単語も時間も完全に止める
  const isPaused = treasureMessage !== null || storyBattleOver || tutorialMessage !== null;

  useEffect(() => {
    if (isGameOver || isPaused) return;

    const floorSpeed = getWordSpeedForFloor(config.wordSpeed, floor);
    const speed = isSlowed ? floorSpeed * ICE_SLOW_SPEED_MULTIPLIER : floorSpeed;

    const timer = setInterval(() => {
      setWordX((prev) => prev - speed);
    }, 16);

    return () => clearInterval(timer);
  }, [config.wordSpeed, floor, isGameOver, isSlowed, isPaused]);

  // 残り時間のカウントダウン
  useEffect(() => {
    if (isGameOver || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameOver, isPaused]);

  // 残り時間・プレイヤーHPのどちらかが尽きたらゲームオーバー
  useEffect(() => {
    if (!isGameOver && (timeLeft <= 0 || playerHp <= 0)) {
      setIsGameOver(true);
    }
  }, [timeLeft, playerHp, isGameOver]);

  // ゲームオーバーになった瞬間に1回だけ、ログイン中ならスコアを記録する
  // （backend/DESIGN.md 5節。未ログインなら送らない＝ランキングはログインしないと載らない）。
  // ストーリーモードの個々の雑魚戦勝利では送らない（毎回小さいスコアが大量に積み上がって
  // しまうため。「1回の挑戦の記録」として意味を持つゲームオーバー時のみにしている）
  const scoreSubmittedRef = useRef(false);

  useEffect(() => {
    if (!isGameOver || scoreSubmittedRef.current) return;

    scoreSubmittedRef.current = true;
    api.postScore(isStory ? "story" : "practice", isStory ? null : level, score, floor).catch(() => {});
  }, [isGameOver, isStory, level, score, floor]);

  // これまでの最大コンボを記録しておく（ゲームオーバー画面用）
  useEffect(() => {
    setMaxCombo((prev) => Math.max(prev, combo));
  }, [combo]);

  const tickDown = (list: ActiveEnemy[]) =>
    list.map((e) => ({ ...e, turnsUntilAttack: e.turnsUntilAttack - 1 }));

  // 次の単語を選ぶ。魔法を使うかどうかは自動抽選ではなく、
  // プレイヤーが1/2/3キーで自分の好きなタイミングに選ぶ（activateMagic参照）ので、
  // 新しい単語はいつも魔法なしから始まる。phaseによって自分の攻撃用/敵の攻撃用の
  // どちらのプールから選ぶかが変わる（pickWordForPhase参照）
  const pickNextWord = (phase: Phase) => {
    const word = pickWordForPhase(phase);

    setActiveMagicType(null);
    setCurrentKana(word.kana);
    setCurrentKanji(word.kanji);
    setUnits(buildWordUnits(word.kana));
    setUnitIndex(0);
    setUnitProgress("");
    setResolvedRomaji([]);
    setSlowWordsRemaining((prev) => Math.max(prev - 1, 0));
  };

  // 自分の攻撃が終わった後、生存中の敵のカウントダウンを進めて
  // 0になった敵がいれば、その分だけ防御フェーズに入る
  const startNextRound = (survivors: ActiveEnemy[]) => {
    setWordX(1000);

    if (survivors.length === 0) {
      // フロアクリア。次の階の敵はフルのカウントダウンで待っているので、このターンは防御なし
      pickNextWord("playerAttack");
      setPhase("playerAttack");
      return;
    }

    const attackers = survivors.filter((e) => e.turnsUntilAttack <= 0);
    const nextPhase: Phase = attackers.length > 0 ? "enemyAttack" : "playerAttack";

    pickNextWord(nextPhase);
    setPhase(nextPhase);

    if (attackers.length > 0) {
      setDefenseQueue(attackers);
      setDefenseIndex(0);
    }
  };

  // 雷魔法：生存中の敵全員に同時にダメージを与える
  const resolveLightningAttack = (damagePerEnemy: number) => {
    showDamage(damagePerEnemy, "enemy", false, "lightning");

    setAoeFlash(true);
    window.setTimeout(() => setAoeFlash(false), HIT_FLASH_MS);

    let scoreGain = 0;
    let defeatedCount = 0;
    const survivors: ActiveEnemy[] = [];
    let drop: { name: string; type: MagicType } | null = null;

    activeEnemies.forEach((e) => {
      const nextHp = e.hp - damagePerEnemy;

      if (nextHp <= 0) {
        scoreGain += e.score;
        defeatedCount += 1;

        if (!drop && e.dropsMagic && Math.random() < MAGIC_DROP_CHANCE) {
          drop = { name: e.name, type: e.dropsMagic };
        }
      } else {
        survivors.push({ ...e, hp: nextHp });
      }
    });

    if (scoreGain > 0) {
      setScore((prev) => prev + scoreGain);
      setTimeLeft((prev) => prev + TIME_BONUS_PER_KILL * defeatedCount);
    }

    if (drop) {
      const d = drop as { name: string; type: MagicType };
      showMagicDrop(d.name, d.type);
    }

    if (defeatedCount > 0) tryDropWord();

    const tickedSurvivors = tickDown(survivors);

    setActiveEnemies(tickedSurvivors);

    if (tickedSurvivors.length === 0) {
      if (isStory) {
        setBattleLearnedWordsSnapshot([...battleLearnedWordsRef.current]);
        setStoryBattleOver(true);
      } else {
        setPendingNextFloor(floor + 1);
        grantTreasure();
      }
    }

    startNextRound(tickedSurvivors);
  };

  // 自分の攻撃：単語を1つ打ち終えるたびに、即座にダメージを与える
  const resolvePlayerAttack = (missCount: number, isTimeout: boolean) => {
    const front = activeEnemies[0];

    if (!front) return;

    const multiplier = getMissPenaltyMultiplier(missCount, floor);
    // 魔法の単語を打ち切れたときだけ発動する（時間切れでは発動しない＝在庫は減らない）
    const magicType = activeMagicType;
    const usedMagic = magicType !== null && !isTimeout && magicCounts[magicType] > 0;
    // 時間切れ、または魔法発動時は会心が出ない
    const isCrit = !isTimeout && !usedMagic && Math.random() < getCritChance(combo);
    const baseDamage = Math.round(
      getWordPower(currentKana) * multiplier * attackMultiplier
    );

    // 時間切れ（打ち切れなかった）ときはダメージを与えない
    const damage = isTimeout
      ? 0
      : usedMagic && magicType === "fire"
      ? Math.round(baseDamage * FIRE_DAMAGE_MULTIPLIER)
      : isCrit
      ? Math.round(baseDamage * CRIT_DAMAGE_MULTIPLIER)
      : baseDamage;

    setPlayerAttacking(true);
    window.setTimeout(() => setPlayerAttacking(false), ATTACK_LUNGE_MS);

    if (usedMagic && magicType) {
      setMagicCounts((prev) => ({ ...prev, [magicType]: prev[magicType] - 1 }));

      if (magicType === "ice") {
        setSlowWordsRemaining(ICE_SLOW_WORD_COUNT);
      }
    }

    if (isTimeout) {
      // 打ち切れなかったので、コンボは途切れる
      setCombo(0);
    } else {
      setCombo((prev) => prev + 1);
    }

    if (usedMagic && magicType === "lightning") {
      resolveLightningAttack(damage);
      return;
    }

    // ダメージ0（時間切れ）のときは「-0」のような表示を出さない
    if (damage > 0) {
      showDamage(damage, "enemy", isCrit, usedMagic ? magicType : null);
    }

    const nextHp = front.hp - damage;
    const rest = activeEnemies.slice(1);

    if (nextHp <= 0) {
      // 撃破。HPを0にした状態で少し表示してからフェードアウトさせる
      const tickedRest = tickDown(rest);

      setActiveEnemies([{ ...front, hp: 0 }, ...tickedRest]);
      setDefeatingUid(front.uid);
      setScore((prev) => prev + front.score);
      setTimeLeft((prev) => prev + TIME_BONUS_PER_KILL);

      if (front.dropsMagic && (front.isBoss || Math.random() < MAGIC_DROP_CHANCE)) {
        showMagicDrop(front.name, front.dropsMagic);
      }

      tryDropWord();

      if (tickedRest.length === 0) {
        if (isStory) {
          setBattleLearnedWordsSnapshot([...battleLearnedWordsRef.current]);
          setStoryBattleOver(true);
        } else {
          setPendingNextFloor(floor + 1);
          grantTreasure();
        }

        window.setTimeout(() => setDefeatingUid(null), DEFEAT_FADE_MS);
      } else {
        window.setTimeout(() => {
          setDefeatingUid(null);
          setActiveEnemies(tickedRest);
        }, DEFEAT_FADE_MS);
      }

      startNextRound(tickedRest);
    } else {
      const ticked = tickDown([{ ...front, hp: nextHp }, ...rest]);

      setActiveEnemies(ticked);

      setEnemyHit(true);
      window.setTimeout(() => setEnemyHit(false), HIT_FLASH_MS);

      startNextRound(ticked);
    }
  };

  // 敵の攻撃（防御）：単語1つ＝敵1体分の攻撃。打ち終わるたびに即座に解決する
  const resolveDefenseWord = (missCount: number) => {
    const attacker = defenseQueue[defenseIndex];

    if (attacker) {
      const multiplier = getMissPenaltyMultiplier(missCount, floor);
      const damageTaken = Math.round(
        attacker.attackDamage * (1 - multiplier) * defenseMultiplier
      );

      if (damageTaken > 0) {
        setPlayerHit(true);
        window.setTimeout(() => setPlayerHit(false), HIT_FLASH_MS);

        setScreenFlash(true);
        window.setTimeout(() => setScreenFlash(false), SCREEN_FLASH_MS);

        showDamage(damageTaken, "player");

        setPlayerHp((prev) => Math.max(prev - damageTaken, 0));
      }

      // 攻撃し終わったので、またattackInterval分だけカウントダウンをやり直す
      setActiveEnemies((prev) =>
        prev.map((e) =>
          e.uid === attacker.uid
            ? { ...e, turnsUntilAttack: e.attackInterval }
            : e
        )
      );
    }

    setWordX(1000);

    const nextIndex = defenseIndex + 1;
    const nextPhase: Phase = nextIndex >= defenseQueue.length ? "playerAttack" : "enemyAttack";

    pickNextWord(nextPhase);

    if (nextIndex >= defenseQueue.length) {
      setPhase("playerAttack");
      setDefenseQueue([]);
      setDefenseIndex(0);
    } else {
      setDefenseIndex(nextIndex);
    }
  };

  // 単語を1つ「打ち終える」たびに呼ばれる（正しく打ち切った場合と、時間切れの場合の両方）
  const advanceWord = (missOverride?: number, isTimeout = false) => {
    const missCount = missOverride ?? turnMissCount;

    // 打ち切れた（時間切れではない）ときだけ残り時間にボーナスを加算する
    if (!isTimeout) {
      setTimeLeft((prev) => prev + TIME_BONUS_PER_WORD);
    }

    if (phase === "enemyAttack") {
      resolveDefenseWord(missCount);
    } else {
      resolvePlayerAttack(missCount, isTimeout);
    }

    setTurnMissCount(0);
  };

  useEffect(() => {
    if (isGameOver || isPaused) return;

    if (wordX < -300) {
      // 単語を最後まで打ちきれなかった。大きめのミスとして扱う
      setMissFlash(true);
      window.setTimeout(() => setMissFlash(false), MISS_FLASH_MS);

      advanceWord(turnMissCount + TIMEOUT_MISS_WEIGHT, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordX, isGameOver, isPaused]);

  // 魔法を1/2/3キーで自分の好きなタイミングに発動する（自分の攻撃フェーズのみ）
  const activateMagic = (type: MagicType) => {
    if (phase !== "playerAttack") return;
    if (magicCounts[type] <= 0) return;

    // もう一度同じキーを押すと選択解除できるようにする
    setActiveMagicType((prev) => (prev === type ? null : type));
  };

  const registerMiss = () => {
    setMissFlash(true);
    window.setTimeout(() => setMissFlash(false), MISS_FLASH_MS);

    setTurnMissCount((prev) => prev + 1);
    // 押し間違えた時点でコンボは途切れる
    setCombo(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isGameOver) return;

    // 宝箱を開いている間・ストーリー戦闘の勝利演出中・チュートリアル説明中は
    // Enterでの再開だけを受け付ける
    if (isPaused) {
      if (e.key === "Enter") {
        e.preventDefault();

        if (tutorialMessage) {
          setTutorialMessage(null);
          return;
        }

        if (storyBattleOver) {
          // 勝った場合は、戦闘終了時点の実際のHPをそのまま次へ持ち越す
          writeStoryBattleResult({
            outcome: "win",
            encounter: isBossEncounter ? "boss" : "field",
            hp: playerHp,
            maxHp: maxPlayerHp,
            learnedWords: battleLearnedWordsRef.current,
            chapter,
          });
          // /storyのコンポーネントがNext.jsのクライアント側キャッシュで使い回されると
          // マウント時の効果（戦闘結果の反映）が再実行されないことがあるため、
          // あえてハードナビゲーションで確実に作り直す
          window.location.href = "/story";
          return;
        }

        setTreasureMessage(null);

        if (pendingNextFloor !== null) {
          const nextFloor = pendingNextFloor;

          setPendingNextFloor(null);
          setFloor(nextFloor);
          setActiveEnemies(spawnFloorEnemies(nextFloor));
        }
      }
      return;
    }

    if (e.key === "1" || e.key === "2" || e.key === "3") {
      e.preventDefault();
      activateMagic(e.key === "1" ? "fire" : e.key === "2" ? "ice" : "lightning");
      return;
    }

    // 通常の1文字キー以外（Shift, Backspace, Enterなど）は無視
    if (e.key.length !== 1) return;

    e.preventDefault();

    // 現在のユニット・入力途中の文字列・確定済みローマ字をローカル変数で追いかけ、
    // 「今のユニットで完結する」か「実は既に確定していて、次のユニットに繰り越す」かを判定する。
    // （例: 「たんぽぽ」の「ん」を"nn"と2文字で打つ場合、1文字目の"n"だけでは
    // 　「ん」の確定か"nn"の途中か区別がつかないので、続きを見てから確定させる）
    let idx = unitIndex;
    let progress = unitProgress;
    let resolved = resolvedRomaji;
    const key = e.key.toLowerCase();

    for (let attempt = 0; attempt < 2; attempt++) {
      const unit = units[idx];

      if (!unit) return;

      const nextProgress = progress + key;
      const viable = unit.candidates.filter((c) => c.startsWith(nextProgress));

      if (viable.length > 0) {
        const exactMatches = viable.filter((c) => c === nextProgress);
        const hasLongerOption = viable.some((c) => c.length > nextProgress.length);

        if (exactMatches.length > 0 && !hasLongerOption) {
          // 他に続く可能性がないので、ここでユニット確定
          const nextResolved = [...resolved, nextProgress];
          const nextUnitIndex = idx + 1;

          setResolvedRomaji(nextResolved);
          setUnitProgress("");
          setUnitIndex(nextUnitIndex);

          if (nextUnitIndex >= units.length) {
            advanceWord();
          }

          return;
        }

        // まだ他の候補にも続く可能性があるので、確定はせず入力だけ進める。
        // 「ん」のロールオーバー（次のユニットへ繰り越し）を経てここに来ることがあるため、
        // unitProgressだけでなくresolvedRomaji・unitIndexもローカル変数の内容で必ず同期させる
        // （これを怠ると、繰り越し後の状態がstateに反映されずに次のキー入力が
        // 　古いユニットと照合されてしまい、正しく打っているのにミス扱いされ続けるバグになる）
        setResolvedRomaji(resolved);
        setUnitIndex(idx);
        setUnitProgress(nextProgress);
        return;
      }

      // このユニットではもう続けられない。
      // ここまでの入力が既にどれかの候補と完全一致しているなら、
      // 「そこで区切って次のユニットに進んだ」とみなし、このキーを次のユニットで判定し直す
      const alreadyMatched = unit.candidates.find((c) => c === progress);

      if (alreadyMatched) {
        resolved = [...resolved, alreadyMatched];
        idx += 1;
        progress = "";

        if (idx >= units.length) {
          setResolvedRomaji(resolved);
          setUnitIndex(idx);
          setUnitProgress("");
          advanceWord();
          return;
        }

        continue;
      }

      // 本当のミス
      registerMiss();
      return;
    }
  };

  const magicMeta = activeMagicType ? MAGIC_META[activeMagicType] : null;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 背景 */}
      <Image
        src={config.background}
        alt="background"
        fill
        priority
        className="object-cover"
      />

      <HomeButton />

      {/* 暗くする */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 被弾フラッシュ */}
      {screenFlash && (
        <div className="absolute inset-0 z-40 bg-red-600 pointer-events-none animate-battle-screen-flash" />
      )}

      {/* UI */}
      <div className="relative z-10 flex flex-col h-full">

        {/* 上部UI */}
        <div className="flex justify-between p-8">

          {/*
            mt-10: 左上のホームボタン（fixed top-6 left-10、高さ32px・y:24〜56）と
            この階層表示が重なって「試練の塔 ○F」が読めなくなっていたため、
            ホームボタンの下まで避けるよう余白を入れている。階層表示自体も
            text-sm opacity-80だと薄くて見落としやすかったので、背景チップ付きの
            大きめの表示に変えた
          */}
          <div className="mt-16">

            {/* 試練の塔の階層表示は試練の塔モードだけ（ストーリーモードには階層の概念が無いため） */}
            {!isStory && (
              <p className="text-white text-lg font-bold bg-black/40 inline-block px-3 py-1 rounded">
                試練の塔 {floor}F
              </p>
            )}

          </div>

          <div className="flex flex-col items-center gap-1 self-center">

            <p
              className={cn(
                "text-3xl font-bold",
                timeLeft <= 10 ? "text-red-500 animate-battle-pop" : "text-white"
              )}
            >
              ⏱ {timeLeft}
            </p>

            <p className="text-white text-lg">
              {phase === "playerAttack" ? "アタックチャンス！" : "てきの こうげき！"}
            </p>

          </div>

          <div className="text-right text-white">

            {/* スコアも試練の塔モードだけ表示する（ストーリーモードでは意味を持たないため） */}
            {!isStory && <p>Score : {score}</p>}

            {/* コンボ：会心率メーター */}
            <div className="w-40">
              <p className="text-xs opacity-80">
                会心率 {Math.round((getCritChance(combo) / MAX_CRIT_CHANCE) * 100)}%
                （combo {combo}）
              </p>
              <div className="w-40 h-3 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                  style={{
                    width: `${(getCritChance(combo) / MAX_CRIT_CHANCE) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-1 justify-end">
              {MAGIC_TYPES.map((type, i) => (
                <p
                  key={type}
                  className={cn(
                    MAGIC_META[type].wordColor,
                    activeMagicType === type && "animate-battle-pop underline"
                  )}
                >
                  [{i + 1}] {MAGIC_META[type].emoji} x{magicCounts[type]}
                </p>
              ))}
            </div>

          </div>

        </div>

        {/* 階層表示 */}
        {floorAnnounce !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <p
              className="text-white text-9xl font-black animate-battle-floor-announce"
              style={{ WebkitTextStroke: "3px black" }}
            >
              {floorAnnounce}F
            </p>
          </div>
        )}

        {/* 魔法ゲット演出 */}
        {getMessage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none">
            <div
              className={cn(
                "bg-gray-900 border-4 rounded-xl px-10 py-6 text-center animate-battle-pop",
                getMessage.type === "fire" && "border-red-400",
                getMessage.type === "ice" && "border-cyan-300",
                getMessage.type === "lightning" && "border-violet-400"
              )}
            >
              <p className={cn("text-3xl font-bold mb-2", MAGIC_META[getMessage.type].wordColor)}>
                {MAGIC_META[getMessage.type].emoji} {MAGIC_META[getMessage.type].label}の魔法 ゲット！
              </p>
              <p className="text-white text-lg">{getMessage.text}</p>
            </div>
          </div>
        )}

        {/* 言葉ドロップ演出（ストーリーモードのみ） */}
        {wordGetMessage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="bg-gray-900 border-4 border-cyan-300 rounded-xl px-10 py-6 text-center animate-battle-pop">
              <p className="text-cyan-300 text-3xl font-bold mb-2">📖 言霊ゲット！</p>
              <p className="text-white text-lg">{wordGetMessage}</p>
            </div>
          </div>
        )}

        {/*
          チュートリアル戦（キングスライムとの初戦闘）でだけ出る、コトの説明ポップアップ。
          treasureMessage等と同じくEnterが押されるまでゲームを止める
        */}
        {tutorialMessage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="bg-gray-900 border-4 border-cyan-300 rounded-xl px-10 py-6 text-center animate-battle-pop max-w-xl">
              <p className="text-cyan-300 text-2xl font-bold mb-3">📖 コトのアドバイス</p>
              <div className="space-y-1 mb-3">
                {tutorialMessage.map((line, i) => (
                  <p key={i} className="text-white text-lg">
                    {line}
                  </p>
                ))}
              </div>
              <p className="text-white/70 text-sm">Enterキーで戦闘を再開</p>
            </div>
          </div>
        )}

        {/*
          宝箱ゲット演出（Enterが押されるまでゲームは止まったまま）。
          この演出はbg-black/60で画面全体を暗くするため、左上の小さい階層表示
          （「試練の塔 ○F」）が見えにくくなってしまう。宝箱を開けている間もこれから
          何階に進むのかがひと目でわかるよう、ポップアップ自体に階層番号を出す
        */}
        {treasureMessage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="bg-gray-900 border-4 border-yellow-400 rounded-xl px-10 py-6 text-center animate-battle-pop">
              <p className="text-yellow-300 text-3xl font-bold mb-2">
                🎁 宝箱ゲット！
              </p>
              <p className="text-white text-lg">
                {ITEM_META[treasureMessage.type].emoji}{" "}
                {ITEM_META[treasureMessage.type].label}
              </p>
              <p className="text-white text-lg mb-3">{treasureMessage.text}</p>
              <p className="text-white/70 text-sm">
                Enterキーで {pendingNextFloor ?? floor + 1}F へ
              </p>
            </div>
          </div>
        )}

        {/*
          ストーリー戦闘の勝利演出（Enterが押されるまで/storyへは戻らない）。
          以前は戦闘中に言葉を見つけたときの演出（wordGetMessage）が数秒で自動的に
          消えてしまい、倒した直後に勝利演出（同じ位置に重なって表示される）に
          即座に隠されてしまうことがあった。この戦闘で見つけた言葉は勝利が決まった
          瞬間にbattleLearnedWordsSnapshotへコピーしてあるので、それをここで一覧
          表示することで「勝利」と「ゲットしたもの」を同じログにまとめている
          （refの中身を描画中に直接読むとReactのlintルールに引っかかるため、
          stateにコピーしたものを描画に使う）
        */}
        {storyBattleOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="bg-gray-900 border-4 border-yellow-400 rounded-xl px-10 py-6 text-center animate-battle-pop">
              <p className="text-yellow-300 text-3xl font-bold mb-2">
                {isBossEncounter ? "🎉 ボスをたおした！" : "勝利！"}
              </p>
              {battleLearnedWordsSnapshot.length > 0 && (
                <div className="text-cyan-300 text-lg mb-3">
                  <p className="mb-1">📖 見つけた言葉</p>
                  {battleLearnedWordsSnapshot.map((kana) => {
                    const word = CHAPTER1_WORD_DICTIONARY.find((w) => w.kana === kana);

                    return (
                      <p key={kana} className="text-white text-base">
                        {word ? `『${word.kanji}（${word.kana}）』` : `『${kana}』`}
                      </p>
                    );
                  })}
                </div>
              )}
              <p className="text-white/70 text-sm">Enterキーで戻る</p>
            </div>
          </div>
        )}

        {/* ゲームオーバー */}
        {isGameOver && (
          // 修正済みのバグ：以前はbg-black/80（8割透明）だったため、裏で止まっている
          // 単語表示（流れるローマ字・漢字）がうっすら透けて見えてしまっていた
          // （「たまに変な文字が見える」の原因）。ゲームオーバーは操作を止める画面なので
          // 完全に不透明にして、裏の表示が見えないようにした
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
            <div className="bg-gray-900 border-4 border-red-500 rounded-xl px-12 py-8 text-center">
              <p className="text-red-500 text-4xl font-bold mb-4">GAME OVER</p>
              {!isStory && (
                <>
                  <p className="text-white text-xl mb-1">到達階層：{floor}F</p>
                  <p className="text-white text-xl mb-1">スコア：{score}</p>
                </>
              )}
              <p className="text-white text-xl">最大コンボ：{maxCombo}</p>

              {isStory && (
                <Button
                  className="mt-6"
                  onClick={() => {
                    // 負けた場合は全回復してから村へ戻す（0のまま持ち越すと、次の
                    // 戦闘に入った瞬間にまたゲームオーバーになってしまうため）
                    writeStoryBattleResult({
                      outcome: "lose",
                      encounter: isBossEncounter ? "boss" : "field",
                      hp: maxPlayerHp,
                      maxHp: maxPlayerHp,
                      learnedWords: battleLearnedWordsRef.current,
                      chapter,
                    });
                    // /storyのコンポーネントがNext.jsのクライアント側キャッシュで使い回されると
          // マウント時の効果（戦闘結果の反映）が再実行されないことがあるため、
          // あえてハードナビゲーションで確実に作り直す
          window.location.href = "/story";
                  }}
                >
                  村に戻る
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 真ん中 */}
        <div className="flex-1 flex items-center justify-between px-24">

          {/* プレイヤー */}

          {/*
            修正済みのバグ：素材画像（syuzinkousyoumen.png）は348×773pxの縦長の
            立ち絵だが、以前はwidth={240} height={240}で正方形の箱に強制していたため、
            縦横比が合わずはみ出した部分（足元）が切れて表示されていた。
            StoryDialogue.tsxの立ち絵と同じく、fill + object-containで箱に収める
            方式に直し、縦横比を保ったまま全身が収まるようにした
          */}
          <div className="relative w-36 h-72">

            <Image
              src="/images/kaiwa/syuzinkousyoumen.png"
              alt="player"
              fill
              className={cn(
                "object-contain",
                playerAttacking && "animate-battle-lunge",
                playerHit && "animate-battle-shake brightness-150"
              )}
            />

            {damageTexts
              .filter((d) => d.target === "player")
              .map((d) => (
                <span
                  key={d.id}
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-red-400 text-3xl font-bold animate-battle-float-up pointer-events-none"
                >
                  -{d.amount}
                </span>
              ))}

            {/*
              修正済み：以前は画面左上に離れて「Player HP」の文字とバーを表示していたが、
              敵側のHP表示（画像の上に重ねる方式）と揃えて、プレイヤーの立ち絵の上に
              直接重ねる形に変えた
            */}
            <div className="absolute -bottom-1 left-0 right-0 px-1">
              <p className="text-white text-xs text-center bg-black/50 rounded px-1">
                HP {playerHp}/{maxPlayerHp}
              </p>
              <div className="h-2 bg-gray-700 rounded overflow-hidden mt-0.5">
                <div
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
                />
              </div>
            </div>

          </div>

          {/* 敵グループ */}

          <div className="flex items-end gap-6">

            {activeEnemies.map((enemy, i) => {
              const isFront = i === 0;
              const isHit = isFront ? enemyHit : false;

              return (
                <div
                  key={enemy.uid}
                  className={cn(
                    "flex flex-col items-center",
                    !isFront && "opacity-50 scale-75"
                  )}
                >

                  <div
                    className={cn(
                      "relative",
                      enemy.isBoss ? "w-80 h-80" : isFront ? "w-60 h-60" : "w-40 h-40"
                    )}
                  >

                    {enemy.isBoss && (
                      <div className="absolute inset-0 rounded-full ring-4 ring-red-500 shadow-[0_0_30px_rgba(255,0,0,0.6)] pointer-events-none" />
                    )}

                    <Image
                      src={enemy.image}
                      alt={enemy.name}
                      fill
                      sizes="320px"
                      className={cn(
                        "object-contain",
                        (isHit || aoeFlash) && "animate-battle-shake brightness-150",
                        defeatingUid === enemy.uid && "animate-battle-defeat-fade"
                      )}
                    />

                    {(isHit || aoeFlash) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-white/80 animate-battle-impact" />
                      </div>
                    )}

                    {isFront &&
                      damageTexts
                        .filter((d) => d.target === "enemy")
                        .map((d) => (
                          <span
                            key={d.id}
                            className={cn(
                              "absolute top-0 left-1/2 -translate-x-1/2 font-bold animate-battle-float-up pointer-events-none",
                              d.magic
                                ? cn(MAGIC_META[d.magic].damageColor, "text-5xl")
                                : d.crit
                                ? "text-orange-400 text-4xl"
                                : "text-yellow-300 text-3xl"
                            )}
                          >
                            {d.magic && MAGIC_META[d.magic].emoji}-{d.amount}
                            {d.crit && "!!"}
                          </span>
                        ))}

                    {/* 次の攻撃まで残りターン数。HP表示と重ならないよう右上に配置 */}
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 border border-white text-white text-sm flex items-center justify-center">
                      {enemy.turnsUntilAttack}
                    </div>

                    {/*
                      修正済み：以前は名前・HP・バーを画像の下に別要素として並べていたが、
                      プレイヤー側と揃えて、モンスターの画像の上に直接重ねる形に変えた。
                      バーだけだとHPがほぼ0になったとき（撃破演出中など）に細すぎて
                      見えづらいので、数字も常に表示しておく
                    */}
                    <div className="absolute -bottom-1 left-1 right-1">
                      {enemy.isBoss && (
                        <p className="text-red-400 text-xs font-black tracking-widest text-center">
                          ★ BOSS ★
                        </p>
                      )}
                      <p className="text-white text-xs text-center bg-black/50 rounded px-1">
                        {enemy.name} HP {Math.max(enemy.hp, 0)}/{enemy.maxHp}
                      </p>
                      <div className="h-2 bg-gray-700 rounded overflow-hidden mt-0.5">
                        <div
                          className={cn(
                            "h-full rounded transition-all duration-300",
                            enemy.isBoss
                              ? "bg-gradient-to-r from-yellow-400 to-red-500"
                              : "bg-red-500"
                          )}
                          style={{
                            width: `${Math.max((enemy.hp / enemy.maxHp) * 100, 0)}%`,
                          }}
                        />
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* 下 */}
        <div className="pb-12 flex flex-col items-center gap-5">

          {/* 単語の漢字表示。流れる単語とは違い、画面中央に固定して読みやすくする */}
          <p
            className={cn(
              "text-4xl font-bold",
              magicMeta ? magicMeta.wordColor : "text-white"
            )}
            style={{
              textShadow: magicMeta
                ? `0 0 14px ${magicMeta.glow}, 0 0 28px ${magicMeta.glow}`
                : undefined,
            }}
          >
            {currentKanji}
          </p>

          {/* 流れるローマ字（自分の攻撃=白、敵の攻撃=黒、魔法の単語=魔法の色のオーラ） */}
          {/* 今打っている候補（shi/si等）に合わせて動的に切り替わる */}

          <div
            className="absolute flex flex-col items-center whitespace-nowrap"
            style={{
              left: `${wordX}px`,
              bottom: "180px",
              textShadow: magicMeta
                ? `0 0 14px ${magicMeta.glow}, 0 0 28px ${magicMeta.glow}`
                : undefined,
            }}
          >
            <div className="text-6xl font-bold tracking-wide">
              {units.map((unit, unitI) => {
                // 打ち終えたユニットは確定した表記、今打っているユニットは
                // ここまでの入力に一致する候補、まだのユニットはデフォルト表記を表示する
                const display =
                  unitI < unitIndex
                    ? resolvedRomaji[unitI] ?? unit.candidates[0]
                    : unitI === unitIndex
                    ? unit.candidates.find((c) => c.startsWith(unitProgress)) ??
                      unit.candidates[0]
                    : unit.candidates[0];

                const typedCount =
                  unitI < unitIndex
                    ? display.length
                    : unitI === unitIndex
                    ? unitProgress.length
                    : 0;

                const baseColor = magicMeta
                  ? magicMeta.wordColor
                  : phase === "playerAttack"
                  ? "text-white"
                  : "text-black";

                return (
                  <span key={unitI}>
                    {display.split("").map((char, charI) => {
                      const isTyped = charI < typedCount;
                      const isNext = unitI === unitIndex && charI === typedCount;

                      return (
                        <span
                          key={charI}
                          className={
                            isTyped
                              ? "text-green-400"
                              : isNext && missFlash
                              ? "text-red-700"
                              : baseColor
                          }
                          style={
                            phase === "enemyAttack" && !isTyped
                              ? { WebkitTextStroke: "1px white" }
                              : undefined
                          }
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                );
              })}
            </div>
          </div>

        </div>

        {/*
          入力欄（表示用の値は持たず、キー入力の判定だけに使う）。
          修正済みのバグ：以前は「下」のflexカラムの一部としてドキュメントの
          流れの中に置いていたため、プレイヤー・敵の立ち絵を含む中央エリアが
          画面の高さより大きくなったときに、この入力欄だけ画面外へ押し出されて
          しまうことがあった（フォーカスした瞬間にブラウザが押し出された入力欄へ
          スクロールしようとして、画面全体が上にずれて見える現象の原因）。
          背景画像の上に固定表示するfixedに変えることで、中央エリアの高さに
          左右されず常に同じ位置に表示されるようにした
        */}
        <input
          ref={inputRef}
          value=""
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          autoFocus
          className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[500px] h-16 rounded-lg text-center text-3xl text-black z-10"
        />

      </div>

    </div>
  );
}
