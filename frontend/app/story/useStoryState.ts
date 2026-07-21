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
// desertTown/fairyVillageは2章「砂漠の町」・3章「妖精の里」のエリアマップ
// （フィールドの目印から入れるようになる。StoryGame.tsxのhandleBump参照）
export type StoryScene =
  | "select"
  | "prologue"
  | "intro"
  | "elderVisit"
  | "meetKoto"
  | "town"
  | "field"
  | "ending"
  | "desertTown"
  | "fairyVillage";

export type Chapter1State = {
  scene: StoryScene;
  // 現在挑戦中の章。ボスを倒すたびに+1される（battle/page.tsxが渡す&chapter=、
  // StoryGame.tsxの戦闘結果処理参照）。章が増えるたびに章選択画面で個別に
  // 判定するのではなく、この数値だけを見ればどこまで進んだか分かるようにする狙い
  currentChapter: number;
  playerPos: { x: number; y: number };
  wordsLearned: string[]; // 覚えた単語のkana
  bossDefeated: boolean;
  // 一度でも戦闘（雑魚戦・ボス戦問わず）を経験したか。falseの間だけ、次に入る戦闘へ
  // &tutorial=1を付けてコトの操作説明を出す（StoryGame.tsxのhandleBump/handleFieldStep参照）
  hasHadFirstBattle: boolean;
  // 村を出る前に、出口の前にいる謎の少年（stranger）に話しかけたか。falseの間は
  // 村の門でコトに止められて外に出られない（StoryGame.tsxのhandleBump参照）。
  // ボス撃破後は少年自体が村からいなくなるので、以後この値は意味を持たなくなる
  hasMetStranger: boolean;
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
  // 「はな」を覚えた直後の名づけイベントで決めた、プレイヤー自身の名前。
  // 未設定の間は空文字（StoryGame.tsxのhandleBump参照）
  playerName: string;
  // 「なまえ」を覚えた後、村人（kind:"npc"）に付けた名前。interactableのidをキーにする。
  // 名づけるか・つけずにランダムな名前にするかを選べ、一度決めたら固定される。
  // ここに入る名前はどちらもタイピングゲームの単語プールには一切使わない
  // （プレイヤーが短い名前を選ぶだけで有利になってしまうのを避けるため）
  npcNames: Record<string, string>;
  // 名づけミッション（村人全員に名前をつける）を完了し、始まりの島↔本土の橋が
  // 架かったかどうか。trueになるとFIELD_MAPの(113,10)/(113,11)が歩けるようになる
  // （StoryGame.tsxのbuildFieldMap呼び出し、chapter1Data.tsのFIELD_BRIDGE_TILES参照）
  bridgeBuilt: boolean;
};

const STORAGE_KEY = "storyProgress";
export const DEFAULT_MAX_HP = 100;

const DEFAULT_STATE: Chapter1State = {
  scene: "select",
  currentChapter: 1,
  playerPos: { x: 0, y: 0 },
  wordsLearned: [],
  bossDefeated: false,
  hasHadFirstBattle: false,
  hasMetStranger: false,
  chestsOpened: [],
  attackBooks: 0,
  defenseBooks: 0,
  hpBooks: 0,
  potions: 0,
  playerHp: DEFAULT_MAX_HP,
  maxPlayerHp: DEFAULT_MAX_HP,
  journalEntries: [],
  playerName: "",
  npcNames: {},
  bridgeBuilt: false,
};

// ============================================================
// セーブスロット
// ============================================================
// オートセーブ（auto）1本と、手動セーブ（slot1〜3）3本の、計4本のスロットを持つ。
// autoは今までどおり操作のたびに自動で上書きされ続ける「今遊んでいる内容」。
// slot1〜3はプレイヤーが「セーブ」を選んだ瞬間の内容だけをコピーしたスナップショットで、
// 明示的にセーブし直すまでは変化しない（タイトル画面の「つづきから」でどのスロットから
// 再開するか選べる。StoryGame.tsx参照）
export type SaveSlotId = "auto" | "slot1" | "slot2" | "slot3";
export const MANUAL_SAVE_SLOT_IDS: SaveSlotId[] = ["slot1", "slot2", "slot3"];
const ALL_SAVE_SLOT_IDS: SaveSlotId[] = ["auto", "slot1", "slot2", "slot3"];

type SavedSlot = { state: Chapter1State; savedAt: string };
type SaveFile = Partial<Record<SaveSlotId, SavedSlot>>;

function loadSaveFile(): SaveFile {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    // 修正済み：複数スロット対応の前は{chapter1: Chapter1State}という単一セーブ
    // （オートセーブ1本のみ）の形式だった。それ以前に保存されたデータを開いても
    // 進行状況を失わないよう、そのままautoスロットへ移行して読み込む
    if (parsed && parsed.chapter1 && !parsed.slots) {
      return {
        auto: { state: { ...DEFAULT_STATE, ...parsed.chapter1 }, savedAt: new Date().toISOString() },
      };
    }

    return (parsed && parsed.slots) || {};
  } catch {
    return {};
  }
}

function saveSaveFile(file: SaveFile) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots: file }));
}

function loadSlotState(id: SaveSlotId): Chapter1State {
  const slot = loadSaveFile()[id];

  return slot ? { ...DEFAULT_STATE, ...slot.state } : DEFAULT_STATE;
}

function writeSlotState(id: SaveSlotId, state: Chapter1State) {
  const file = loadSaveFile();

  file[id] = { state, savedAt: new Date().toISOString() };
  saveSaveFile(file);
}

// つづきから・セーブ画面の一覧表示用に、スロット1個ぶんの中身を要約する。
// 何も保存されていないスロットはnull（空き）を返す
export type SlotSummary = {
  id: SaveSlotId;
  savedAt: string;
  currentChapter: number;
  sceneLabel: string;
  wordsLearnedCount: number;
};

const SCENE_LABELS: Record<StoryScene, string> = {
  select: "タイトル",
  prologue: "プロローグ",
  intro: "夢のシーン",
  elderVisit: "長老の家",
  meetKoto: "コトとの出会い",
  town: "はじまりの村",
  field: "外の草原",
  ending: "エンディング",
  desertTown: "砂漠の町",
  fairyVillage: "妖精の里",
};

export function getSlotSummary(id: SaveSlotId): SlotSummary | null {
  const slot = loadSaveFile()[id];

  if (!slot) return null;

  return {
    id,
    savedAt: slot.savedAt,
    currentChapter: slot.state.currentChapter,
    sceneLabel: SCENE_LABELS[slot.state.scene] ?? slot.state.scene,
    wordsLearnedCount: slot.state.wordsLearned.length,
  };
}

export function getAllSlotSummaries(): Record<SaveSlotId, SlotSummary | null> {
  const result = {} as Record<SaveSlotId, SlotSummary | null>;

  for (const id of ALL_SAVE_SLOT_IDS) {
    result[id] = getSlotSummary(id);
  }

  return result;
}

// 第1章の進行状況を永続化するフック。ログインしていなければ従来どおりlocalStorageのみ、
// ログイン中はbackend/（Express、GET/PUT /api/progress）にも同期する
// （backend/DESIGN.md 5節の方針：常にlocalStorageへ即書き込みつつ、ログイン中は
// fire-and-forgetでバックエンドにも送る。通信失敗してもゲーム進行は止めない）。
// /battle へ遷移してまた戻ってくる際に状態を維持するためにも必要。
export function useStoryState() {
  // 修正済みのバグ：以前はDEFAULT_STATEで初期化していたため、マウント直後の
  // 一瞬（ログイン確認のAPI通信が返ってくるまでの間）は必ずまっさらな状態
  // （wordsLearned:[]・scene:"select"等）になっていた。/battleからのハード
  // ナビゲーション直後にちょうどこの一瞬が重なると、戦闘結果を反映する
  // useEffect（StoryGame.tsx）がこのまっさらな状態に対してupdate()してしまい、
  // 直後に非同期処理側がlocalStorageの内容で上書きする際、まだそのタイミングでは
  // 保存されていた本来の進行状況（覚えた言葉・宝箱の開封状況など）が失われる
  // 競合状態になっていた。useStateの初期値をlocalStorageから同期的に読み込む
  // ことで、マウント直後から常に正しい状態になるようにした
  const [state, setState] = useState<Chapter1State>(() => loadSlotState("auto"));
  const isLoggedInRef = useRef(false);
  // 修正済みのバグ：ログイン確認〜サーバーの進行状況取得（api.me→api.getProgress）は
  // 非同期なので、その応答が返ってくるまでの間にローカル側で更新（update/learnWord）が
  // 1回でも起きていたら、そのローカルの変更のほうが必ず新しい。にもかかわらず、応答が
  // 返ってきた時点で無条件にsetState(merged)していたため、/battleから戻ってボス撃破結果
  // （scene:"ending"・bossDefeated・なまえ習得など）をローカルへ反映した直後に、まだ
  // その反映がサーバーへ送信・保存される前のサーバー側の古い進行状況で上書きしてしまう
  // ことがあった（エンディングが一瞬表示されてすぐフィールドに戻る、なまえが消えて
  // 見えるように見えた原因）。ローカルで何か更新があった後は、このマウント中の
  // サーバー同期を諦める（＝ローカルを正として扱う）ことで防いでいる
  const hasLocalChangeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then(async () => {
        if (cancelled) return;

        isLoggedInRef.current = true;

        try {
          const { state: remoteState } = await api.getProgress<Chapter1State>(CHAPTER_ID);

          if (cancelled || hasLocalChangeRef.current) return;

          const merged = { ...DEFAULT_STATE, ...remoteState };

          setState(merged);
          writeSlotState("auto", merged);
        } catch {
          // サーバー側にまだセーブが無い（初回ログイン等）場合は、今持っている
          // localStorageの内容（ゲスト時代のセーブかもしれない）をそのまま使う。
          // 起動時点で既にlocalStorageから読み込み済みなので、ここでは何もしなくてよい
        }
      })
      .catch(() => {
        // 未ログイン。起動時点で既にlocalStorageから読み込み済みなので何もしなくてよい
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // localStorageのautoスロットへ即保存しつつ、ログイン中はバックエンドへも送る
  // 共通ヘルパー（自動セーブ。手動セーブのslot1〜3はsaveToSlotで別途行う）
  const persist = useCallback((next: Chapter1State) => {
    hasLocalChangeRef.current = true;
    writeSlotState("auto", next);

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
  const openChest = useCallback((chestId: string, item: "attack" | "defense" | "hp" | "potion" | "map", count = 1) => {
    setState((prev) => {
      if (prev.chestsOpened.includes(chestId)) return prev;

      const next: Chapter1State = {
        ...prev,
        chestsOpened: [...prev.chestsOpened, chestId],
        attackBooks: item === "attack" ? prev.attackBooks + count : prev.attackBooks,
        defenseBooks: item === "defense" ? prev.defenseBooks + count : prev.defenseBooks,
        hpBooks: item === "hp" ? prev.hpBooks + count : prev.hpBooks,
        potions: item === "potion" ? prev.potions + count : prev.potions,
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

  // 手動セーブ。今の進行状況を、選んだスロット（slot1〜3。autoは対象外）へ
  // そのままスナップショットとしてコピーする。呼び出し側はslotIdをユーザーに選ばせる
  // （MANUAL_SAVE_SLOT_IDS参照）
  const saveToSlot = useCallback(
    (id: SaveSlotId) => {
      if (id === "auto") return;

      writeSlotState(id, state);
    },
    [state]
  );

  // 指定したスロットの内容を読み込み、今のプレイ状態として復元する。
  // 読み込んだ後の自動セーブは通常どおりautoスロットに書き込まれる
  // （＝読み込んだ時点でautoの中身もこのスロットの内容に置き換わる）
  const loadFromSlot = useCallback(
    (id: SaveSlotId) => {
      const loaded = loadSlotState(id);

      setState(loaded);
      persist(loaded);
    },
    [persist]
  );

  return {
    state,
    update,
    learnWord,
    openChest,
    useHpBook,
    usePotion,
    addJournalEntry,
    saveToSlot,
    loadFromSlot,
  };
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
  // どの章のボスと戦ったか（battle/page.tsxのURLの&chapter=をそのまま渡す）。
  // ボスに勝った場合、StoryGame.tsx側でcurrentChapterをこの値+1に進める
  chapter?: number;
};

const BATTLE_RESULT_KEY = "storyBattleResult";

export function writeStoryBattleResult(result: StoryBattleResult) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(result));
}

// /battleから戻ってきた直後（戦闘結果の反映待ち）かどうかを、中身を消費せずに
// 確認するだけのヘルパー。StoryGame.tsxがタイトル画面を出すかどうかの判定に使う
// （読み込み中に戦闘結果があるなら、それはハードナビゲーションで村・フィールドに
// 戻ってきた瞬間なので、タイトルを挟まず結果の反映へ直行させたい）
export function hasPendingStoryBattleResult(): boolean {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(BATTLE_RESULT_KEY) !== null;
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
