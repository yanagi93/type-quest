"use client";

import Image from "next/image";
import { Card } from "@/components/ui/8bit/card";
import { DotGothic16 } from "next/font/google";
import { cn } from "@/lib/utils";
import { HomeButton } from "@/components/HomeButton";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

const CHAPTER_TITLES = [
  "はじまりの草原",
  "迷いの森",
  "氷雪の王国",
  "灼熱火山",
  "天空神殿",
  "絶望の海",
  "沈黙の塔",
  "魔王城",
];

type ChapterSelectProps = {
  chapter1Complete: boolean;
  onEnterChapter1: () => void;
};

export function ChapterSelect({ chapter1Complete, onEnterChapter1 }: ChapterSelectProps) {
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

      <div className={cn(dotFont.className, "relative z-10 flex flex-col items-center gap-6 pt-10 h-full overflow-y-auto")}>
        <Card className="text-2xl px-8 py-4 bg-black/60 border-2 border-cyan-400 text-cyan-300">
          言霊の書
        </Card>

        <div className="grid grid-cols-4 gap-6 px-10 pb-10">
          {CHAPTER_TITLES.map((title, i) => {
            const chapter = i + 1;
            const isChapter1 = chapter === 1;
            const locked = !isChapter1;

            return (
              <Card
                key={chapter}
                onClick={isChapter1 ? onEnterChapter1 : undefined}
                className={cn(
                  "relative w-[220px] h-[140px] flex flex-col items-center justify-center gap-2 transition",
                  isChapter1
                    ? "cursor-pointer hover:scale-105 ring-2 ring-yellow-400"
                    : "opacity-50"
                )}
              >
                {locked && <span className="text-3xl">🔒</span>}

                <p className="text-sm text-center">
                  第{chapter}章 {title}
                </p>

                {isChapter1 && (
                  <p className="text-xs text-yellow-300">
                    {chapter1Complete ? "クリア済み・もう一度あそぶ" : "はじめる"}
                  </p>
                )}

                {locked && <p className="text-xs text-gray-300">近日公開</p>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
