import type { WordEntry } from "../battle/words";

// ストーリーモード専用の単語リスト（試練の塔のwords.tsとは共有しない）。
// 敵が繰り出してくる言葉（防御フェーズ）はこちらから選ぶ。プレイヤー自身が
// 打つ単語（攻撃フェーズ）とは別枠で、必ずしも覚えた単語とは限らない
// （battle/page.tsxのenemyWordList参照）
export const CHAPTER1_FIELD_WORDS: WordEntry[] = [
  { kana: "みず", kanji: "水" },
  { kana: "ひ", kanji: "火" },
  { kana: "かぜ", kanji: "風" },
  { kana: "くさ", kanji: "草" },
  { kana: "はな", kanji: "花" },
  { kana: "き", kanji: "木" },
];
