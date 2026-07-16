"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/8bit/button";
import { SaveSlots } from "./SaveSlots";
import { MANUAL_SAVE_SLOT_IDS, type SaveSlotId, type SlotSummary } from "./useStoryState";

const KOTO_PORTRAIT_IMAGE = "/images/kaiwa/kotodamanosei1.png";

type KotodamaBookProps = {
  journalEntries: string[];
  onSave: () => void;
  slotSummaries: Record<SaveSlotId, SlotSummary | null>;
  onSaveToSlot: (id: SaveSlotId) => void;
};

// 主人公が常に持っている『言霊の書』タブの中身。「記録する」を押すと、
// セーブ1〜3のどの枠に記録するか選ぶ画面になる。枠を選ぶと、旅の記憶が1行増えるのと
// 同時に、実際のセーブ（useStoryStateのslot1〜3。セーブ枠3つまで、+オートセーブ）
// もその枠へ行われる。
// 修正済み：以前は「記録する」が実際のセーブ処理と無関係な演出（旅の記憶を書くだけ）
// だったが、独立していた「💾 セーブ」ボタン・オーバーレイをここに統合した
export function KotodamaBook({ journalEntries, onSave, slotSummaries, onSaveToSlot }: KotodamaBookProps) {
  const [showSlots, setShowSlots] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSelectSlot = (id: SaveSlotId) => {
    onSave();
    onSaveToSlot(id);
    setShowSlots(false);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <Image src={KOTO_PORTRAIT_IMAGE} alt="コト" fill className="object-contain" />
        </div>
        <p className="text-sm">
          コト「ここまでの旅を、この本に記録しておこうか？」
        </p>
      </div>

      {!showSlots ? (
        <Button onClick={() => setShowSlots(true)}>📖 記録する</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">どの枠に記録しますか？</p>

          <SaveSlots
            slotIds={MANUAL_SAVE_SLOT_IDS}
            summaries={slotSummaries}
            allowEmpty
            onSelect={handleSelectSlot}
          />

          <Button onClick={() => setShowSlots(false)}>キャンセル</Button>
        </div>
      )}

      {justSaved && (
        <div className="border-2 border-yellow-400 rounded-md p-4 text-center bg-yellow-950/10">
          <p className="text-yellow-300 text-sm">━━━━━━━━━━━━━━━</p>
          <p className="mt-2">言霊の書に記録しました。</p>
          <p className="mt-1 font-bold">「旅の記憶」が刻まれた。</p>
          <p className="text-yellow-300 text-sm mt-2">━━━━━━━━━━━━━━━</p>
        </div>
      )}

      {journalEntries.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">これまでの記憶</p>
          <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
            {journalEntries
              .slice()
              .reverse()
              .map((entry, i) => (
                <p
                  key={journalEntries.length - i}
                  className="text-xs border-l-2 border-cyan-500/50 pl-2 text-muted-foreground"
                >
                  {entry}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
