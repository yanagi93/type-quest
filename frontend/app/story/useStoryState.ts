"use client";

import { useCallback, useEffect, useState } from "react";

export type StoryScene = "select" | "intro" | "town" | "field" | "ending";

export type Chapter1State = {
  scene: StoryScene;
  playerPos: { x: number; y: number };
  wordsLearned: string[]; // 覚えた単語のkana
  bossDefeated: boolean;
};

const STORAGE_KEY = "storyProgress";

const DEFAULT_STATE: Chapter1State = {
  scene: "select",
  playerPos: { x: 0, y: 0 },
  wordsLearned: [],
  bossDefeated: false,
};

function loadState(): Chapter1State {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw);

    return { ...DEFAULT_STATE, ...parsed.chapter1 };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: Chapter1State) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ chapter1: state }));
}

// 第1章の進行状況（現在のシーン・プレイヤー位置・覚えた単語）をlocalStorageに永続化するフック。
// /battle へ遷移してまた戻ってくる際に状態を維持するために必要。
export function useStoryState() {
  const [state, setState] = useState<Chapter1State>(DEFAULT_STATE);

  useEffect(() => {
    setState(loadState());
  }, []);

  const update = useCallback((patch: Partial<Chapter1State>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };

      saveState(next);

      return next;
    });
  }, []);

  const learnWord = useCallback((kana: string) => {
    setState((prev) => {
      if (prev.wordsLearned.includes(kana)) return prev;

      const next = { ...prev, wordsLearned: [...prev.wordsLearned, kana] };

      saveState(next);

      return next;
    });
  }, []);

  return { state, update, learnWord };
}

// /battle との結果の受け渡し用（勝敗）
export type StoryBattleResult = {
  outcome: "win" | "lose";
  encounter: "field" | "boss";
};

const BATTLE_RESULT_KEY = "storyBattleResult";

export function writeStoryBattleResult(result: StoryBattleResult) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(result));
}

export function readAndClearStoryBattleResult(): StoryBattleResult | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(BATTLE_RESULT_KEY);

  if (!raw) return null;

  window.localStorage.removeItem(BATTLE_RESULT_KEY);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
