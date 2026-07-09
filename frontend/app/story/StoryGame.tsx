"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GridExplorer } from "./GridExplorer";
import { StoryDialogue } from "./StoryDialogue";
import { ChapterSelect } from "./ChapterSelect";
import { WordCollection } from "./WordCollection";
import { useStoryState, readAndClearStoryBattleResult } from "./useStoryState";
import { HomeButton } from "@/components/HomeButton";
import { Button } from "@/components/ui/8bit/button";
import {
  TOWN_MAP,
  TOWN_INTERACTABLES,
  TOWN_TILE_SIZE,
  TOWN_BACKGROUND_IMAGE,
  TOWN_REENTRY_POS,
  FIELD_MAP,
  FIELD_INTERACTABLES,
  BOSS_UNLOCK_WORD_COUNT,
  CHAPTER1_WORD_DICTIONARY,
} from "./chapter1Data";
import type { Interactable } from "./types";

const ENCOUNTER_CHANCE_PER_STEP = 0.15;

const INTRO_LINES = [
  "夜、いつもとおなじ夢を見る。",
  "幼い自分の前に、誰かが立っている。",
  "「君ならきっと……」",
  "――そこで、いつも夢は途切れる。",
  "翌朝、村の長老に呼ばれた。",
  "長老「これを持っていきなさい。『言霊の書』じゃ。」",
  "長老「村の中を歩いて、思い出せる言葉を探すのじゃ。」",
];

const ENDING_LINES = [
  "スライムキングをたおした。",
  "『ゆうき』という言霊を思い出した。",
  "――夢の中、幼い自分が誰かたちと笑っている。",
  "けれど、顔だけがどうしても思い出せない。",
  "第1章 クリア！",
];

type Dialogue = { lines: string[]; title?: string; onComplete: () => void };

export function StoryGame() {
  const router = useRouter();
  const { state, update, learnWord } = useStoryState();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [showWordCollection, setShowWordCollection] = useState(false);

  // /battle から戻ってきたときの結果を一度だけ処理する
  useEffect(() => {
    const result = readAndClearStoryBattleResult();

    if (!result) return;

    if (result.encounter === "boss" && result.outcome === "win") {
      learnWord("ゆうき");
      update({ scene: "ending", bossDefeated: true });
    }
    // フィールド戦の勝敗・ボス戦敗北時は、そのままの位置で探索へ戻るだけでよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnterChapter1 = () => {
    update({
      scene: "intro",
      playerPos: TOWN_MAP.start,
      wordsLearned: [],
      bossDefeated: false,
    });
  };

  const handleBump = (interactable: Interactable) => {
    if (interactable.kind === "exit") {
      const destination = interactable.exitsTo;

      setDialogue({
        lines: interactable.dialogue ?? ["移動した。"],
        onComplete: () => {
          setDialogue(null);

          if (destination === "field") {
            update({ scene: "field", playerPos: FIELD_MAP.start });
          } else if (destination === "town") {
            update({ scene: "town", playerPos: TOWN_REENTRY_POS });
          }
        },
      });
      return;
    }

    if (interactable.kind === "boss") {
      if (state.wordsLearned.length < BOSS_UNLOCK_WORD_COUNT) {
        setDialogue({
          lines: interactable.dialogue ?? [],
          onComplete: () => setDialogue(null),
        });
        return;
      }

      const words = encodeURIComponent(state.wordsLearned.join(","));

      router.push(`/battle?mode=story&chapter=1&encounter=boss&words=${words}`);
      return;
    }

    // 村人・置物（井戸など）の場合
    const teaches = interactable.teachesWord;
    const alreadyLearned = teaches ? state.wordsLearned.includes(teaches.kana) : false;
    const baseLines = interactable.dialogue ?? [];
    const lines =
      teaches && !alreadyLearned
        ? [...baseLines, `『${teaches.kanji}（${teaches.kana}）』を おぼえた！`]
        : baseLines;

    setDialogue({
      lines,
      onComplete: () => {
        setDialogue(null);

        if (teaches) learnWord(teaches.kana);
      },
    });
  };

  const handleFieldStep = (pos: { x: number; y: number }) => {
    update({ playerPos: pos });

    if (Math.random() < ENCOUNTER_CHANCE_PER_STEP) {
      router.push("/battle?mode=story&chapter=1&encounter=field");
    }
  };

  if (state.scene === "select") {
    return (
      <ChapterSelect
        chapter1Complete={state.bossDefeated}
        onEnterChapter1={handleEnterChapter1}
      />
    );
  }

  if (state.scene === "intro") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <Button
          onClick={() => update({ scene: "select" })}
          className="fixed top-6 right-10 z-50"
        >
          📖 章選択に戻る
        </Button>
        <StoryDialogue
          open
          title="プロローグ"
          lines={INTRO_LINES}
          onComplete={() => update({ scene: "town", playerPos: TOWN_MAP.start })}
        />
      </div>
    );
  }

  if (state.scene === "ending") {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center">
        <HomeButton />
        <StoryDialogue
          open
          title="エンディング"
          lines={ENDING_LINES}
          onComplete={() => update({ scene: "select" })}
        />
      </div>
    );
  }

  const isTown = state.scene === "town";
  const map = isTown ? TOWN_MAP : FIELD_MAP;
  const interactables = isTown ? TOWN_INTERACTABLES : FIELD_INTERACTABLES;

  return (
    <div className="relative w-screen h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <HomeButton />

      {/* 途中で章選択に戻りたいときのためのボタン。押すと確認なしで即座に章選択画面へ戻る */}
      <Button
        onClick={() => update({ scene: "select" })}
        className="fixed top-6 right-10 z-50"
      >
        📖 章選択に戻る
      </Button>

      {/* 覚えた言霊（単語）の一覧を見るボタン */}
      <Button
        onClick={() => setShowWordCollection(true)}
        className="fixed top-20 left-10 z-50"
      >
        📚 言霊の書
      </Button>

      <WordCollection
        open={showWordCollection}
        onOpenChange={setShowWordCollection}
        dictionary={CHAPTER1_WORD_DICTIONARY}
        wordsLearned={state.wordsLearned}
      />

      <p className="text-white text-sm">
        {isTown ? "はじまりの草原・村" : "はじまりの草原・外"} ｜ おぼえた言葉：
        {state.wordsLearned.length}/{BOSS_UNLOCK_WORD_COUNT}
      </p>

      <GridExplorer
        map={map}
        interactables={interactables}
        playerPos={state.playerPos}
        onMove={(pos) => update({ playerPos: pos })}
        onBump={handleBump}
        onStepOntoFloor={isTown ? undefined : handleFieldStep}
        isLocked={dialogue !== null || showWordCollection}
        tileSize={isTown ? TOWN_TILE_SIZE : undefined}
        backgroundImageSrc={isTown ? TOWN_BACKGROUND_IMAGE : undefined}
      />

      <p className="text-white/60 text-xs">
        矢印キーで移動 ｜ gキーでマス目のデバッグ表示（当たり判定の確認用）
      </p>

      {dialogue && (
        <StoryDialogue
          open
          lines={dialogue.lines}
          title={dialogue.title}
          onComplete={dialogue.onComplete}
        />
      )}
    </div>
  );
}
