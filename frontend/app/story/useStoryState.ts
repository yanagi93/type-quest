"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ITEM_HP_BONUS, POTION_HEAL_AMOUNT } from "../battle/difficulty";
import { api } from "@/lib/api";

// このストーリーの章ID。第1章しか無いので固定値（backend/DESIGN.md 2節の
// story_progressテーブルはchapter_idを主キーの一部に持たせてあるので、
// 章が増えたらここも章ごとに切り替える形にする）
const CHAPTER_ID = 1;

// "town"＝村の中（詳細な1:1スケールのマップ）、"field"＝村の外に広がる世界地図
// （ドラクエのような、村より大きな縮尺のミニマップ）。別々のマップ・別シーンで、
// 門にぶつかるとシーンごと切り替わる（一時期1枚の地続きマップに統合していたが、
// 「本当にドラクエのように」という要望で元の2マップ構成に戻した）
export type StoryScene = "select" | "prologue" | "intro" | "elderVisit" | "meetKoto" | "town" | "field" | "ending";

export type Chapter1State = {
  scene: StoryScene;
  playerPos: { x: number; y: number };
  wordsLearned: string[]; // 覚えた単語のkana
  bossDefeated: boolean;
  chestsOpened: string[]; // 開けた宝箱のid（同じ宝箱から二度もらえないようにする）
  attackBooks: number; // 宝箱で手に入れた攻撃力の書の数
  defenseBooks: number; // 宝箱で手に入れた防御力の書の数
  // 体力の書・ポーションは、手に入れた時点では持ち物に貯まるだけで即効果は
  // 出さない。持ち物画面から「使う」とその場で効果が出る（useHpBook/usePotion参照）
  hpBooks: number;
  potions: number;
  // HPは戦闘をまたいで持ち越す（減ったまま次の戦闘に入る）。戦闘に負けたときだけ
  // 全回復して村へ戻る（0のまま持ち越すと次の戦闘に入った瞬間詰んでしまうため）
  playerHp: number;
  maxPlayerHp: number;
  // 言霊の書に記録した「旅の記憶」。セーブするたびに1行ずつ増えていく、
  // ゲームの進行には影響しないただの記録（プレイヤー向けの読み物）
  journalEntries: string[];
};

const STORAGE_KEY = "storyProgress";
export const DEFAULT_MAX_HP = 100;

const DEFAULT_STATE: Chapter1State = {
  scene: "select",
  playerPos: { x: 0, y: 0 },
  wordsLearned: [],
  bossDefeated: false,
  chestsOpened: [],
  attackBooks: 0,
  defenseBooks: 0,
  hpBooks: 0,
  potions: 0,
  playerHp: DEFAULT_MAX_HP,
  maxPlayerHp: DEFAULT_MAX_HP,
  journalEntries: [],
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

// 第1章の進行状況を永続化するフック。ログインしていなければ従来どおりlocalStorageのみ、
// ログイン中はbackend/（Express、GET/PUT /api/progress）にも同期する
// （backend/DESIGN.md 5節の方針：常にlocalStorageへ即書き込みつつ、ログイン中は
// fire-and-forgetでバックエンドにも送る。通信失敗してもゲーム進行は止めない）。
// /battle へ遷移してまた戻ってくる際に状態を維持するためにも必要。
export function useStoryState() {
  const [state, setState] = useState<Chapter1State>(DEFAULT_STATE);
  const isLoggedInRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then(async () => {
        if (cancelled) return;

        isLoggedInRef.current = true;

        try {
          const { state: remoteState } = await api.getProgress<Chapter1State>(CHAPTER_ID);

          if (cancelled) return;

          const merged = { ...DEFAULT_STATE, ...remoteState };

          setState(merged);
          saveState(merged);
        } catch {
          // サーバー側にまだセーブが無い（初回ログイン等）場合は、今持っている
          // localStorageの内容（ゲスト時代のセーブかもしれない）をそのまま使う
          if (!cancelled) setState(loadState());
        }
      })
      .catch(() => {
        if (!cancelled) setState(loadState());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // localStorageへ即保存しつつ、ログイン中はバックエンドへも送る共通ヘルパー
  const persist = useCallback((next: Chapter1State) => {
    saveState(next);

    if (isLoggedInRef.current) {
      api.putProgress(CHAPTER_ID, next).catch(() => {
        // 単発の通信失敗は無視する。次の更新時にまた送られるので自然にリカバリされる
      });
    }
  }, []);

  const update = useCallback(
    (patch: Partial<Chapter1State>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };

        persist(next);

        return next;
      });
    },
    [persist]
  );

  const learnWord = useCallback((kana: string) => {
    setState((prev) => {
      if (prev.wordsLearned.includes(kana)) return prev;

      const next = { ...prev, wordsLearned: [...prev.wordsLearned, kana] };

      persist(next);

      return next;
    });
  }, [persist]);

  // 樽・村人から、攻撃力の書・防御力の書・体力の書・ポーションのいずれかを手に入れる
  // （関数名・state名は元の「宝箱」のままだが、見た目は村の樽や村人からの贈り物に
  // 差し替えてある）。どれも持ち物に貯まるだけで、体力の書・ポーションは持ち物画面
  // から使うまで効果が出ない（useHpBook/usePotion参照）。同じidからは一度しかもらえない
  const openChest = useCallback((chestId: string, item: "attack" | "defense" | "hp" | "potion") => {
    setState((prev) => {
      if (prev.chestsOpened.includes(chestId)) return prev;

      const next: Chapter1State = {
        ...prev,
        chestsOpened: [...prev.chestsOpened, chestId],
        attackBooks: item === "attack" ? prev.attackBooks + 1 : prev.attackBooks,
        defenseBooks: item === "defense" ? prev.defenseBooks + 1 : prev.defenseBooks,
        hpBooks: item === "hp" ? prev.hpBooks + 1 : prev.hpBooks,
        potions: item === "potion" ? prev.potions + 1 : prev.potions,
      };

      persist(next);

      return next;
    });
  }, [persist]);

  // 体力の書を1冊使う。その場でさいだいHPが上がり、HPも新しいさいだい値まで全回復する
  // （battle/page.tsxの試練の塔の宝箱と同じ効果量。ITEM_HP_BONUS参照）
  const useHpBook = useCallback(() => {
    setState((prev) => {
      if (prev.hpBooks <= 0) return prev;

      const nextMaxHp = prev.maxPlayerHp + ITEM_HP_BONUS;
      const next: Chapter1State = {
        ...prev,
        hpBooks: prev.hpBooks - 1,
        maxPlayerHp: nextMaxHp,
        playerHp: nextMaxHp,
      };

      persist(next);

      return next;
    });
  }, [persist]);

  // ポーションを1本使う。体力の書と違い、さいだいHPは増えずその場でHPを回復するだけ
  const usePotion = useCallback(() => {
    setState((prev) => {
      if (prev.potions <= 0) return prev;

      const next: Chapter1State = {
        ...prev,
        potions: prev.potions - 1,
        playerHp: Math.min(prev.playerHp + POTION_HEAL_AMOUNT, prev.maxPlayerHp),
      };

      persist(next);

      return next;
    });
  }, [persist]);

  // 言霊の書に「旅の記憶」を1行記録する（セーブのたびにコトが書き加えてくれる、
  // ゲームの進行には影響しないプレイヤー向けの読み物）
  const addJournalEntry = useCallback((entry: string) => {
    setState((prev) => {
      const next: Chapter1State = {
        ...prev,
        journalEntries: [...prev.journalEntries, entry],
      };

      persist(next);

      return next;
    });
  }, [persist]);

  return { state, update, learnWord, openChest, useHpBook, usePotion, addJournalEntry };
}

// /battle との結果の受け渡し用（勝敗＋HP）。
// hp/maxHpは、勝った場合は戦闘終了時点の実際の値、負けた場合は全回復した値を
// battle/page.tsx側で入れて渡してくる
export type StoryBattleResult = {
  outcome: "win" | "lose";
  encounter: "field" | "boss";
  hp: number;
  maxHp: number;
  // 戦闘中に敵を倒したときの低確率ドロップで見つけた、まだ覚えていなかった言葉
  // （kana）。勝敗に関わらず、見つけたものはそのまま持ち帰れる
  learnedWords?: string[];
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
