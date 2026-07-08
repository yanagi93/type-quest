export const difficulty = {
  easy: {
    name: "初級",

    // 背景
    background: "/images/back-ground/easy.png",

    // 敵のHP倍率
    enemyHp: 80,

    // 単語が流れる速さ(px/frame)。ノーマル・ハードは単語の長さで難易度を出すので同じ速さにし、
    // イージーだけ読みやすいようゆっくりにしてある
    wordSpeed: 2,

    // 制限時間(秒)
    timeLimit: 60,

    // 敵の基本攻撃力（防御フェーズで使用。階層に応じてさらに上昇する）
    enemyAttackDamage: 10,

    // スコア
    scorePerEnemy: 100,
  },

  normal: {
    name: "中級",

    background: "/images/back-ground/normal.png",

    enemyHp: 140,

    wordSpeed: 3,

    timeLimit: 60,

    enemyAttackDamage: 15,

    scorePerEnemy: 200,
  },

  hard: {
    name: "上級",

    background: "/images/back-ground/hard.png",

    enemyHp: 220,

    wordSpeed: 3,

    timeLimit: 60,

    enemyAttackDamage: 20,

    scorePerEnemy: 300,
  },
} as const;

export type Difficulty = keyof typeof difficulty;

// 階層が上がるほど、単語が流れる速さを上げる
const WORD_SPEED_INCREASE_PER_FLOOR = 0.05;

export function getWordSpeedForFloor(baseSpeed: number, floor: number): number {
  return baseSpeed * (1 + (floor - 1) * WORD_SPEED_INCREASE_PER_FLOOR);
}

// ミス回数に応じて、攻撃力・防御効果を弱める倍率（0.1〜1.0）を返す。
// 階層が上がるほど「1回のミスの重み」が増していく。
export function getMissPenaltyMultiplier(missCount: number, floor: number): number {
  const penaltyPerMiss = Math.min(0.15 + floor * 0.03, 0.5);

  return Math.max(1 - penaltyPerMiss * missCount, 0.1);
}

// 階層に応じて、同時に出現する敵の数を増やす（最大3体）
export function getEnemyCountForFloor(floor: number): number {
  return Math.min(1 + Math.floor((floor - 1) / 3), 3);
}

// 階層に応じて、敵の攻撃力を上げる
export function getEnemyAttackDamage(baseDamage: number, floor: number): number {
  return Math.round(baseDamage * (1 + (floor - 1) * 0.08));
}

// コンボ数が多いほど会心（クリティカル）が出やすくなる（最大50%）
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

export function getCritChance(combo: number): number {
  return Math.min(combo * 0.03, 0.5);
}

// 単語の「攻撃力」。文字数が多い（＝打つのが大変な）単語ほど威力が高い。
// 階層が上がるほど長い単語が出やすくなる（pickWordForFloor）ので、
// 自然と階層とともに出てくる単語の攻撃力も上がっていく。
export function getWordPower(word: string): number {
  return 10 + word.length * 6;
}

// 魔法（発動タイミングは1/2/3キーでプレイヤーが選ぶ）
export const MAGIC_DROP_CHANCE = 0.35;
export const FIRE_DAMAGE_MULTIPLIER = 2;
export const ICE_SLOW_WORD_COUNT = 3;
export const ICE_SLOW_SPEED_MULTIPLIER = 0.4;

// 単語を文字数（かなの読み）で5段階に分類する
// 短(2〜3) / 中(4〜5) / ちょい長(6〜7) / 長(8〜9) / 超長(10〜)
export type LengthTier = "short" | "medium" | "longish" | "long" | "extreme";

const TIER_ORDER: LengthTier[] = ["short", "medium", "longish", "long", "extreme"];

function getLengthTier(kanaLength: number): LengthTier {
  if (kanaLength <= 3) return "short";
  if (kanaLength <= 5) return "medium";
  if (kanaLength <= 7) return "longish";
  if (kanaLength <= 9) return "long";

  return "extreme";
}

// 難易度ごとの「基準となる長さ」（0=短い〜4=超長い）。
// 階層が上がるとここから右（長い方）にずれていく
const DIFFICULTY_BASE_CENTER: Record<Difficulty, number> = {
  easy: 0.3,
  normal: 1.6,
  hard: 2.8,
};

const CENTER_SHIFT_PER_FLOOR = 0.15;
const TIER_SPREAD = 1.3;

// 難易度・階層に応じて「どのくらいの長さの単語が出やすいか」の重みをつけて選ぶ。
// 階層が上がるほど基準の長さが右（長い方）へ動き、長い単語の出現確率が上がっていく。
// （文字数の判定はkana=読みの長さで行う。表示にはkanjiを使うので単語はkanaを持つオブジェクト）
export function pickWordForFloor<T extends { kana: string }>(
  wordList: readonly T[],
  floor: number,
  difficultyKey: Difficulty
): T {
  const center = Math.min(
    DIFFICULTY_BASE_CENTER[difficultyKey] + floor * CENTER_SHIFT_PER_FLOOR,
    TIER_ORDER.length - 1
  );

  const buckets: Record<LengthTier, T[]> = {
    short: [],
    medium: [],
    longish: [],
    long: [],
    extreme: [],
  };

  wordList.forEach((word) => buckets[getLengthTier(word.kana.length)].push(word));

  const weights = TIER_ORDER.map((tier, i) => {
    if (buckets[tier].length === 0) return 0;

    const distance = i - center;

    return Math.exp(-(distance * distance) / (2 * TIER_SPREAD * TIER_SPREAD));
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    return wordList[Math.floor(Math.random() * wordList.length)];
  }

  let roll = Math.random() * totalWeight;
  let chosenTier: LengthTier = TIER_ORDER[0];

  for (let i = 0; i < TIER_ORDER.length; i++) {
    roll -= weights[i];

    if (roll <= 0) {
      chosenTier = TIER_ORDER[i];
      break;
    }
  }

  const pool = buckets[chosenTier];

  return pool[Math.floor(Math.random() * pool.length)];
}

// ボス階（5階ごと）
export const BOSS_FLOOR_INTERVAL = 5;
export const BOSS_HP_MULTIPLIER = 2;
export const BOSS_SCORE_MULTIPLIER = 4;
export const BOSS_ATTACK_MULTIPLIER = 1.2;

export function isBossFloor(floor: number): boolean {
  return floor % BOSS_FLOOR_INTERVAL === 0;
}

// 宝箱アイテム（階層を上がるたびに1つもらえる）
export const ITEM_ATTACK_BONUS = 0.1;
export const ITEM_DEFENSE_BONUS = 0.1;
export const ITEM_DEFENSE_MULTIPLIER_MIN = 0.3;
export const ITEM_HP_BONUS = 20;
