"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import { Button } from "@/components/ui/8bit/button";
import { cn } from "@/lib/utils";
import { KotodamaBook } from "./KotodamaBook";
import { WordCollection } from "./WordCollection";
import { Inventory } from "./Inventory";
import { Status } from "./Status";
import type { CollectibleWord } from "./chapter1Data";

type Tab = "book" | "words" | "items" | "status";

const TABS: { key: Tab; label: string }[] = [
  { key: "book", label: "📖 言霊の書" },
  { key: "words", label: "🔤 言葉の図鑑" },
  { key: "items", label: "🎒 持ち物" },
  { key: "status", label: "📊 ステータス" },
];

type MenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // 言霊の書タブ
  journalEntries: string[];
  onSave: () => void;

  // 言葉の図鑑タブ
  wordDictionary: CollectibleWord[];
  wordsLearned: string[];

  // 持ち物タブ
  attackBooks: number;
  defenseBooks: number;
  hpBooks: number;
  potions: number;
  onUseHpBook: () => void;
  onUsePotion: () => void;

  // ステータスタブ
  playerHp: number;
  maxPlayerHp: number;
  requiredLearnedCount: number;
  bossUnlockWordCount: number;
};

// 言霊の書・言葉の図鑑・持ち物・ステータスを1つのボタンから開ける、まとめメニュー。
// タブを切り替えて中身を出し分けるだけで、Dialog自体は1つだけ持つ
export function Menu({
  open,
  onOpenChange,
  journalEntries,
  onSave,
  wordDictionary,
  wordsLearned,
  attackBooks,
  defenseBooks,
  hpBooks,
  potions,
  onUseHpBook,
  onUsePotion,
  playerHp,
  maxPlayerHp,
  requiredLearnedCount,
  bossUnlockWordCount,
}: MenuProps) {
  const [tab, setTab] = useState<Tab>("book");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>メニュー</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(tab === t.key && "ring-2 ring-yellow-400")}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "book" && (
          <KotodamaBook journalEntries={journalEntries} onSave={onSave} />
        )}

        {tab === "words" && (
          <WordCollection dictionary={wordDictionary} wordsLearned={wordsLearned} />
        )}

        {tab === "items" && (
          <Inventory
            attackBooks={attackBooks}
            defenseBooks={defenseBooks}
            hpBooks={hpBooks}
            potions={potions}
            canUseHpBook={hpBooks > 0}
            canUsePotion={potions > 0 && playerHp < maxPlayerHp}
            onUseHpBook={onUseHpBook}
            onUsePotion={onUsePotion}
          />
        )}

        {tab === "status" && (
          <Status
            playerHp={playerHp}
            maxPlayerHp={maxPlayerHp}
            attackBooks={attackBooks}
            defenseBooks={defenseBooks}
            wordsLearnedCount={wordsLearned.length}
            wordDictionaryCount={wordDictionary.length}
            requiredLearnedCount={requiredLearnedCount}
            bossUnlockWordCount={bossUnlockWordCount}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
