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
import { FieldMapView } from "./FieldMapView";
import type { CollectibleWord } from "./chapter1Data";
import type { SaveSlotId, SlotSummary } from "./useStoryState";
import type { FloorTileType, PlacedObject } from "./types";

type Tab = "book" | "words" | "items" | "status" | "map";

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
  slotSummaries: Record<SaveSlotId, SlotSummary | null>;
  onSaveToSlot: (id: SaveSlotId) => void;

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
  gold: number;
  weaponTier: number;
  armorTier: number;
  requiredLearnedCount: number;
  bossUnlockWordCount: number;

  // フィールドマップタブ。長老から世界の地図をもらう（chestsOpenedに"house-elder"が
  // 入る）まではタブ自体を出さない
  hasFieldMap: boolean;
  fieldFloorTextures: FloorTileType[][];
  fieldObjects: PlacedObject[];
  fieldPlayerPos: { x: number; y: number } | null;
  fieldObjective: { x: number; y: number } | null;
};

// 言霊の書・言葉の図鑑・持ち物・ステータスを1つのボタンから開ける、まとめメニュー。
// タブを切り替えて中身を出し分けるだけで、Dialog自体は1つだけ持つ
export function Menu({
  open,
  onOpenChange,
  journalEntries,
  onSave,
  slotSummaries,
  onSaveToSlot,
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
  gold,
  weaponTier,
  armorTier,
  requiredLearnedCount,
  bossUnlockWordCount,
  hasFieldMap,
  fieldFloorTextures,
  fieldObjects,
  fieldPlayerPos,
  fieldObjective,
}: MenuProps) {
  const [tab, setTab] = useState<Tab>("book");
  // 地図を持っていないうちはタブ自体を出さない（持ち物と同じく、手に入れて
  // 初めて存在に気づく形にしたいので、グレーアウトではなく非表示にしている）
  const visibleTabs = hasFieldMap ? [...TABS, { key: "map" as const, label: "🗺️ フィールドマップ" }] : TABS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 修正済みのバグ：DialogContentの基底クラス（components/ui/dialog.tsx）に
          sm:max-w-smが入っており、無印のmax-w-xlはtwMergeの競合解決上「別バリアント」
          扱いになって上書きされていなかった（実際の画面幅ではsm:max-w-smが優先され、
          384pxに制限されたまま。フィールドマップ（512px幅）がカードの外にはみ出す
          原因になっていた）。同じsm:接頭辞を付けて確実に上書きする */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>メニュー</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-2">
          {visibleTabs.map((t) => (
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
          <KotodamaBook
            journalEntries={journalEntries}
            onSave={onSave}
            slotSummaries={slotSummaries}
            onSaveToSlot={onSaveToSlot}
          />
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
            gold={gold}
            attackBooks={attackBooks}
            defenseBooks={defenseBooks}
            weaponTier={weaponTier}
            armorTier={armorTier}
            wordsLearnedCount={wordsLearned.length}
            wordDictionaryCount={wordDictionary.length}
            requiredLearnedCount={requiredLearnedCount}
            bossUnlockWordCount={bossUnlockWordCount}
          />
        )}

        {tab === "map" && hasFieldMap && (
          <FieldMapView
            floorTextures={fieldFloorTextures}
            objects={fieldObjects}
            playerPos={fieldPlayerPos}
            objective={fieldObjective}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
