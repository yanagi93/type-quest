"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DotGothic16 } from "next/font/google";
import { Card } from "@/components/ui/8bit/card";
import { cn } from "@/lib/utils";
import type { DialoguePortrait } from "./types";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

type StoryDialogueProps = {
  open: boolean;
  lines: string[];
  onComplete: () => void;
  title?: string;
  // この会話の間、左右に出しっぱなしにする立ち絵（0〜2人）。呼び出す側
  // （StoryGame.tsx）が「宝箱なら主人公×コト」「村人となら村人×コト」のように
  // 場面に応じて決めて渡す
  portraits?: DialoguePortrait[];
  // 行ごとに切り替える全画面の背景画像。linesと同じ数だけ渡すと1行ごとに
  // 絵が変わる（プロローグのように場面が大きく移り変わる演出用）。1枚だけ
  // 渡した場合はその会話の間ずっと同じ絵のまま。lines.lengthより短い配列を
  // 渡した場合、最後まで進んだ後は末尾の画像を表示し続ける（画像を少しずつ
  // 追加していく途中でも壊れないようにするため）
  backgrounds?: string[];
};

// 台詞が「話者名「セリフ」」の形になっている行から、話者名とセリフ本文を取り出す。
// 例: "コト「これは『みず』っていう言霊だよ！」" → { speaker: "コト", text: "これは『みず』っていう言霊だよ！" }
// この形になっていない行（地の文・状況説明）は話者無しとして扱う
const SPEAKER_LINE_PATTERN = /^(.+?)「(.+)」$/;

function parseLine(line: string): { speaker: string | null; text: string } {
  const match = line.match(SPEAKER_LINE_PATTERN);

  if (!match) return { speaker: null, text: line };

  return { speaker: match[1], text: match[2] };
}

// イントロ・単語習得・エンディングで共用する、RPGのメッセージウィンドウ風の会話UI。
// 画面下部にログ（テキストボックス）を固定表示し、portraitsで渡された立ち絵を
// その会話の間ずっと左右に表示する（今しゃべっている側は明るく、そうでない側は
// 少し暗くして、誰の台詞かひと目でわかるようにしている）。
// クリックまたはEnterキーで1行ずつ進む。
export function StoryDialogue({ open, lines, onComplete, title, portraits, backgrounds }: StoryDialogueProps) {
  const [step, setStep] = useState(0);
  // まだ用意されていない背景画像（ファイルが無くて読み込みに失敗したもの）は
  // 壊れた画像アイコンを出さず、単色の暗い背景のまま表示する
  const [failedBackgrounds, setFailedBackgrounds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setStep(0);
  }, [open, lines]);

  const isLast = step >= lines.length - 1;

  const advance = () => {
    if (isLast) onComplete();
    else setStep((prev) => prev + 1);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      advance();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLast, onComplete]);

  if (!open || lines.length === 0) return null;

  // 別のシーンへの切り替わり直後など、lines配列が短くなった直後の1フレームだけ
  // stepが古い（範囲外の）値になることがあるため、範囲内に収めてから読む
  const safeStep = Math.min(step, lines.length - 1);
  const { speaker, text } = parseLine(lines[safeStep]);
  const nameLabel = speaker ?? title;
  const leftPortrait = portraits?.find((p) => p.side === "left");
  const rightPortrait = portraits?.find((p) => p.side === "right");
  // 渡された枚数がlinesより少ない場合は、末尾の画像を表示し続ける
  const backgroundImage = backgrounds?.[Math.min(safeStep, backgrounds.length - 1)];

  const renderPortrait = (portrait: DialoguePortrait) => {
    // 話者が特定できない行（地の文）のときは両方とも明るいまま表示する
    const isSpeaking = !speaker || speaker === portrait.name;

    return (
      <div
        key={portrait.side}
        className={cn(
          "fixed bottom-[186px] flex flex-col items-center gap-1 transition-opacity",
          portrait.side === "left" ? "left-2 md:left-10" : "right-2 md:right-10",
          isSpeaking ? "opacity-100" : "opacity-50"
        )}
      >
        {portrait.image ? (
          // 立ち絵（全身絵）は縦長の枠でそのまま大きく表示する（切り取らずcontainで収める）
          <div className="relative w-40 h-56 md:w-64 md:h-[22rem]">
            <Image src={portrait.image} alt={portrait.name} fill className="object-contain drop-shadow-2xl" />
          </div>
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center bg-slate-800 border-y-6 border-x-6 border-foreground dark:border-ring text-6xl">
            {portrait.emoji}
          </div>
        )}
      </div>
    );
  };

  return (
    // 画面全体を覆うクリック受け皿。会話中は背後の画面を少し暗くして、
    // 会話ウィンドウ・立ち絵に注目しやすくする。クリックした場所に関わらず
    // 1行進める（RPGのメッセージウィンドウでよくある「どこでも押せば進む」挙動）
    <div
      className={cn(dotFont.className, "fixed inset-0 z-50 cursor-pointer")}
      onClick={advance}
    >
      {backgroundImage && !failedBackgrounds.has(backgroundImage) && (
        <Image
          key={backgroundImage}
          src={backgroundImage}
          alt=""
          fill
          priority
          className="object-cover"
          onError={() => setFailedBackgrounds((prev) => new Set(prev).add(backgroundImage))}
        />
      )}
      {/* 会話中は背景を少し暗くして、会話ウィンドウ・立ち絵に注目しやすくする */}
      <div className="absolute inset-0 bg-black/40" />

      {leftPortrait && renderPortrait(leftPortrait)}
      {rightPortrait && renderPortrait(rightPortrait)}

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6">
        <Card className="max-w-4xl mx-auto bg-slate-950/80 text-white">
          <div className="p-5">
            {nameLabel && (
              <p className="text-sm md:text-base font-bold text-yellow-300 mb-2">{nameLabel}</p>
            )}

            <p className="text-base md:text-lg leading-relaxed min-h-[3lh] whitespace-pre-wrap">
              {text}
            </p>

            <p className="text-right text-xs text-white/60 mt-3 animate-pulse">
              ▼ クリック / Enterキーで{isLast ? "とじる" : "つづける"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
