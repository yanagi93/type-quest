"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/8bit/card";
import { DotGothic16 } from "next/font/google";
import { cn } from "@/lib/utils";
import { HomeButton } from "@/components/HomeButton";
import { getAllSlotSummaries, type SaveSlotId } from "./useStoryState";
import { SaveSlots } from "./SaveSlots";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

const CONTINUE_SLOT_ORDER: SaveSlotId[] = ["auto", "slot1", "slot2", "slot3"];

type TitleScreenProps = {
  onNewGame: () => void;
  // 「つづきから」で選んだスロットを実際に読み込んで再開する処理はStoryGame.tsx側
  // （useStoryStateのloadFromSlot）に任せてあるので、ここでは選ばれたIDを渡すだけ
  onSelectSlot: (id: SaveSlotId) => void;
};

// 修正済み：以前は8章ぶんのカードを並べて7個を🔒で「近日公開」にする章選択画面
// （ChapterSelect.tsx）だったが、実際にはまだ1章しか実装が無いのに8個並べるのは
// 実態と合っていなかった。「はじめから」「つづきから」だけのシンプルなタイトル
// 画面に置き換えた（章が増えたときも、この画面自体は変えずに済む）。
// 「つづきから」はオートセーブ＋手動セーブ3本のどれから再開するか選べるようにした
// （SaveSlots参照）
export function TitleScreen({ onNewGame, onSelectSlot }: TitleScreenProps) {
  const [showSlots, setShowSlots] = useState(false);
  // 画面を開くたびに1回だけ読めば十分（このタイトル画面を表示している間に
  // 他のタブでセーブが増えたりはしないため）
  const summaries = useMemo(() => getAllSlotSummaries(), []);
  const hasAnySave = CONTINUE_SLOT_ORDER.some((id) => summaries[id] != null);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Image
        src="/images/back-ground/story-select.png"
        alt="背景"
        fill
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-black/40" />

      <HomeButton className={dotFont.className} />

      <div
        className={cn(
          dotFont.className,
          "relative z-10 flex flex-col items-center justify-center gap-8 h-full"
        )}
      >
        <Card className="text-3xl px-10 py-5 bg-black/60 border-2 border-cyan-400 text-cyan-300">
          言霊の書
        </Card>

        {!showSlots ? (
          <div className="flex flex-col gap-4">
            <Card
              onClick={onNewGame}
              className="cursor-pointer hover:scale-105 transition w-64 py-4 text-center text-lg"
            >
              はじめから
            </Card>

            {hasAnySave && (
              <Card
                onClick={() => setShowSlots(true)}
                className="cursor-pointer hover:scale-105 transition w-64 py-4 text-center text-lg ring-2 ring-yellow-400"
              >
                つづきから
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-white text-sm">どのセーブから再開しますか？</p>

            <SaveSlots slotIds={CONTINUE_SLOT_ORDER} summaries={summaries} onSelect={onSelectSlot} />

            <Card
              onClick={() => setShowSlots(false)}
              className="cursor-pointer hover:scale-105 transition w-40 py-2 text-center text-sm"
            >
              ← もどる
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
