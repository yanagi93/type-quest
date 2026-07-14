"use client";

import { Card } from "@/components/ui/8bit/card";
import { cn } from "@/lib/utils";
import type { SaveSlotId, SlotSummary } from "./useStoryState";

const SLOT_LABELS: Record<SaveSlotId, string> = {
  auto: "オートセーブ",
  slot1: "セーブ1",
  slot2: "セーブ2",
  slot3: "セーブ3",
};

type SaveSlotsProps = {
  slotIds: SaveSlotId[];
  summaries: Partial<Record<SaveSlotId, SlotSummary | null>>;
  onSelect: (id: SaveSlotId) => void;
  // つづきから（読み込み）は中身が無いスロットは選べない。セーブ（書き込み）は
  // 空きスロットにも新規で保存できるようにしたいので、そちらはtrueにする
  allowEmpty?: boolean;
};

function formatSavedAt(iso: string): string {
  const date = new Date(iso);

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

// タイトル画面の「つづきから」・ゲーム中の「セーブ」の両方で使う、セーブスロット
// 一覧のUI。中身が無いスロットは要約の代わりに「空」と表示する
export function SaveSlots({ slotIds, summaries, onSelect, allowEmpty = false }: SaveSlotsProps) {
  return (
    <div className="flex flex-col gap-3">
      {slotIds.map((id) => {
        const summary = summaries[id];
        const clickable = allowEmpty || summary != null;

        return (
          <Card
            key={id}
            onClick={clickable ? () => onSelect(id) : undefined}
            className={cn(
              "w-80 px-4 py-3 transition",
              clickable ? "cursor-pointer hover:scale-105" : "opacity-50"
            )}
          >
            <p className="text-sm font-bold">{SLOT_LABELS[id]}</p>

            {summary ? (
              <p className="text-xs opacity-80 mt-1">
                第{summary.currentChapter}章 ｜ {summary.sceneLabel} ｜ 言葉{summary.wordsLearnedCount}個
                <br />
                {formatSavedAt(summary.savedAt)}
              </p>
            ) : (
              <p className="text-xs opacity-60 mt-1">（空）</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
