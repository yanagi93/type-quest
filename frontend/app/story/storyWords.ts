import type { WordEntry } from "../battle/words";

// ストーリーモード専用の単語リスト（試練の塔のwords.tsとは共有しない）。
// フィールドの雑魚戦は、覚えた3語＋補充語彙で少し変化をつける。
export const CHAPTER1_FIELD_WORDS: WordEntry[] = [
  { kana: "みず", kanji: "水" },
  { kana: "ひ", kanji: "火" },
  { kana: "かぜ", kanji: "風" },
  { kana: "くさ", kanji: "草" },
  { kana: "はな", kanji: "花" },
];

// ボス戦では、実際に覚えた単語だけを使う（呼び出し側でwordsLearnedによりフィルタする）
export const CHAPTER1_BOSS_WORDS: WordEntry[] = [
  { kana: "みず", kanji: "水" },
  { kana: "ひ", kanji: "火" },
  { kana: "かぜ", kanji: "風" },
];

export function pickStoryWord(list: readonly WordEntry[]): WordEntry {
  return list[Math.floor(Math.random() * list.length)];
}
