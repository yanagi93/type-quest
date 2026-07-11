"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/8bit/button";

const KOTO_PORTRAIT_IMAGE = "/images/kaiwa/kotodamanosei1.png";

type KotodamaBookProps = {
  journalEntries: string[];
  onSave: () => void;
};

// 主人公が常に持っている『言霊の書』タブの中身。「記録する」を押すと、コトが
// ひとこと言ってから旅の記憶を1行書き加える、というセーブの演出。実際のセーブ
// 自体はuseStoryStateが全ての更新のたびに自動でlocalStorageへ行っているので、
// ここでの「記録する」は技術的なセーブ処理ではなく、プレイヤーに見せるための
// 儀式・読み物としての機能になっている
export function KotodamaBook({ journalEntries, onSave }: KotodamaBookProps) {
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    onSave();
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

      <Button onClick={handleSave}>📖 記録する</Button>

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
