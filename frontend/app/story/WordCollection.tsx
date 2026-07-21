"use client";

import { getWordPower } from "../battle/difficulty";
import { cn } from "@/lib/utils";
import { WORD_EXCLUDED_FROM_COUNT, NAME_UNLOCK_WORD_KANA, type CollectibleWord } from "./chapter1Data";

type WordCollectionProps = {
  dictionary: CollectibleWord[];
  wordsLearned: string[];
};

// 覚えた言霊（言葉）の一覧を見せる図鑑（言葉の図鑑タブの中身）。
// まだ覚えていない単語は「？？？」で伏せて、ヒントだけ見せる。
export function WordCollection({ dictionary, wordsLearned }: WordCollectionProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        言葉の図鑑（{wordsLearned.length}/{dictionary.length}）
      </p>

      <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        {dictionary.map((word) => {
          const obtained = wordsLearned.includes(word.kana);

          return (
            <div
              key={word.kana}
              className={cn(
                "border-2 rounded-md p-3 flex flex-col items-center gap-1",
                obtained ? "border-cyan-500/70 bg-cyan-950/10" : "border-gray-500/50"
              )}
            >
              {obtained ? (
                <>
                  <p className="text-2xl font-bold">{word.kanji}</p>
                  <p className="text-sm text-muted-foreground">{word.kana}</p>
                  <p className="text-xs text-yellow-400 mt-1">
                    威力 {getWordPower(word.kana)}
                  </p>
                  {word.kana !== WORD_EXCLUDED_FROM_COUNT && word.kana !== NAME_UNLOCK_WORD_KANA && (
                    <p className="text-[10px] text-cyan-400">★ 外に出る条件にカウントされる</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-500">？？？</p>
                  <p className="text-xs text-gray-500 text-center">
                    {word.hint}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
