"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import type { CollectibleWord } from "./chapter1Data";

type WordCollectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dictionary: CollectibleWord[];
  wordsLearned: string[];
};

// 覚えた言霊（言葉）の一覧を見せる図鑑のような画面。
// まだ覚えていない単語は「？？？」で伏せて、ヒントだけ見せる。
export function WordCollection({
  open,
  onOpenChange,
  dictionary,
  wordsLearned,
}: WordCollectionProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            言霊の書（{wordsLearned.length}/{dictionary.length}）
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {dictionary.map((word) => {
            const obtained = wordsLearned.includes(word.kana);

            return (
              <div
                key={word.kana}
                className="border-2 rounded-md p-3 flex flex-col items-center gap-1 border-gray-500/50"
              >
                {obtained ? (
                  <>
                    <p className="text-2xl font-bold">{word.kanji}</p>
                    <p className="text-sm text-muted-foreground">{word.kana}</p>
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
      </DialogContent>
    </Dialog>
  );
}
