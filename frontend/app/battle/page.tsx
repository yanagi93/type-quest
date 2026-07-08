"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
import { enemies } from "./enemy";
import { buildWordUnits, type WordUnit } from "./romaji";
import { cn } from "@/lib/utils";

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

  // levelが変わるたびにkeyも変わるので、Reactはこのコンポーネントを
  // 使い回さず作り直す（＝floorやスコアなどのstateが確実にリセットされる）
  return <BattleGame key={level} level={level} />;
}

function BattleGame({ level }: { level: string }) {
  const diffKey: Difficulty =
    level === "normal" || level === "hard" ? level : "easy";

  const config = difficulty[diffKey];

  const enemyList = enemies[diffKey];

  const wordList = words[diffKey];

  // 階層と敵グループ
  const [floor, setFloor] = useState(1);
  const [activeEnemies, setActiveEnemies] = useState<ActiveEnemy[]>([]);
  // 階が変わるたびに、大きく表示する階層番号
  const [floorAnnounce, setFloorAnnounce] = useState<number | null>(null);
  // 宝箱を開いている間、次の階への切り替えをEnterが押されるまで保留しておく
  const [pendingNextFloor, setPendingNextFloor] = useState<number | null>(null);

  // ターン制の進行管理
  const [phase, setPhase] = useState<Phase>("playerAttack");
  // 敵の攻撃(防御)フェーズで、今ターン攻撃してくる敵の並び
  const [defenseQueue, setDefenseQueue] = useState<ActiveEnemy[]>([]);
  const [defenseIndex, setDefenseIndex] = useState(0);
  const [turnMissCount, setTurnMissCount] = useState(0);

  const [maxPlayerHp, setMaxPlayerHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);

  // 宝箱で強化される、攻撃力・被ダメージの倍率
  const [attackMultiplier, setAttackMultiplier] = useState(1);
  const [defenseMultiplier, setDefenseMultiplier] = useState(1);
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

  const isSlowed = slowWordsRemaining > 0;

  const pickWord = () => pickWordForFloor(wordList, floor, diffKey);

  const spawnFloorEnemies = (targetFloor: number): ActiveEnemy[] => {
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
        setMaxPlayerHp((prev) => prev + ITEM_HP_BONUS);
        setPlayerHp((prev) => prev + ITEM_HP_BONUS);
        text = "さいだいHPが上がった！";
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

  // ゲーム開始時に1階の敵と最初の単語を用意する
  useEffect(() => {
    setActiveEnemies(spawnFloorEnemies(1));

    const word = pickWordForFloor(wordList, 1, diffKey);

    setCurrentKana(word.kana);
    setCurrentKanji(word.kanji);
    setUnits(buildWordUnits(word.kana));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordList]);

  // 階層が変わるたびに、大きく表示してから消す
  useEffect(() => {
    setFloorAnnounce(floor);

    const timer = window.setTimeout(() => setFloorAnnounce(null), 1600);

    return () => window.clearTimeout(timer);
  }, [floor]);

  // 宝箱を開いている間は、単語も時間も完全に止める
  const isPaused = treasureMessage !== null;

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

  // これまでの最大コンボを記録しておく（ゲームオーバー画面用）
  useEffect(() => {
    setMaxCombo((prev) => Math.max(prev, combo));
  }, [combo]);

  const tickDown = (list: ActiveEnemy[]) =>
    list.map((e) => ({ ...e, turnsUntilAttack: e.turnsUntilAttack - 1 }));

  // 次の単語を選ぶ。魔法を使うかどうかは自動抽選ではなく、
  // プレイヤーが1/2/3キーで自分の好きなタイミングに選ぶ（activateMagic参照）ので、
  // 新しい単語はいつも魔法なしから始まる
  const pickNextWord = () => {
    const word = pickWord();

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
      pickNextWord();
      setPhase("playerAttack");
      return;
    }

    const attackers = survivors.filter((e) => e.turnsUntilAttack <= 0);
    const nextPhase: Phase = attackers.length > 0 ? "enemyAttack" : "playerAttack";

    pickNextWord();
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

    const tickedSurvivors = tickDown(survivors);

    setActiveEnemies(tickedSurvivors);

    if (tickedSurvivors.length === 0) {
      setPendingNextFloor(floor + 1);
      grantTreasure();
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

    const damage =
      usedMagic && magicType === "fire"
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

    showDamage(damage, "enemy", isCrit, usedMagic ? magicType : null);

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

      if (tickedRest.length === 0) {
        setPendingNextFloor(floor + 1);
        grantTreasure();

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

    pickNextWord();

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

    // 宝箱を開いている間はEnterでの再開だけを受け付ける
    if (isPaused) {
      if (e.key === "Enter") {
        e.preventDefault();
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

        // まだ他の候補にも続く可能性があるので、確定はせず入力だけ進める
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

          <div>

            <p className="text-white text-sm opacity-80">
              試練の塔 {floor}F
            </p>

            <p className="text-white text-xl">
              Player HP ({playerHp}/{maxPlayerHp})
            </p>

            <div className="w-80 h-5 bg-gray-700 rounded overflow-hidden">

              <div
                className="h-full bg-green-500 rounded transition-all"
                style={{
                  width: `${(playerHp / maxPlayerHp) * 100}%`,
                }}
              />

            </div>

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

            <p>Score : {score}</p>

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

        {/* 宝箱ゲット演出（Enterが押されるまでゲームは止まったまま） */}
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
              <p className="text-white/70 text-sm">Enterキーで次の階へ</p>
            </div>
          </div>
        )}

        {/* ゲームオーバー */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
            <div className="bg-gray-900 border-4 border-red-500 rounded-xl px-12 py-8 text-center">
              <p className="text-red-500 text-4xl font-bold mb-4">GAME OVER</p>
              <p className="text-white text-xl mb-1">到達階層：{floor}F</p>
              <p className="text-white text-xl mb-1">スコア：{score}</p>
              <p className="text-white text-xl">最大コンボ：{maxCombo}</p>
            </div>
          </div>
        )}

        {/* 真ん中 */}
        <div className="flex-1 flex items-center justify-between px-24">

          {/* プレイヤー */}

          <div className="relative">

            <Image
              src="/images/player/player.png"
              alt="player"
              width={240}
              height={240}
              className={cn(
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

                    {/* 次の攻撃まで残りターン数 */}
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-black/70 border border-white text-white text-sm flex items-center justify-center">
                      {enemy.turnsUntilAttack}
                    </div>

                  </div>

                  {enemy.isBoss && (
                    <p className="text-red-400 text-lg font-black tracking-widest">
                      ★ BOSS ★
                    </p>
                  )}

                  <p className="text-white text-xl mt-2">

                    {enemy.name}

                  </p>

                  <div
                    className={cn(
                      "h-4 bg-gray-700 rounded mt-1 overflow-hidden",
                      enemy.isBoss ? "w-80" : "w-56"
                    )}
                  >

                    <div
                      className={cn(
                        "h-full rounded transition-all duration-300",
                        enemy.isBoss
                          ? "bg-gradient-to-r from-yellow-400 to-red-500"
                          : "bg-red-500"
                      )}
                      style={{
                        width: `${(enemy.hp / enemy.maxHp) * 100}%`,
                      }}
                    />

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

          {/* 入力欄（表示用の値は持たず、キー入力の判定だけに使う） */}

            <input
            ref={inputRef}
            value=""
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            autoFocus
            className="
                w-[500px]
                h-16
                rounded-lg
                text-center
                text-3xl
                text-black
            "
            />
        </div>

      </div>

    </div>
  );
}
