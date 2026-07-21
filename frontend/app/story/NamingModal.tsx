"use client";

import { useState } from "react";
import { DotGothic16 } from "next/font/google";
import { Card } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { cn } from "@/lib/utils";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

const MAX_NAME_LENGTH = 8;

type NamingModalProps = {
  open: boolean;
  message: string;
  // 「名づける/このままにする」を選ばせてから開く。「このままにする」を選ぶと
  // onSubmit(null)を呼ぶ（呼び出し側でランダムな名前を割り当てる。
  // StoryGame.tsxのhandleNamingSubmit参照）。プレイヤー自身の名前・村人の名前、
  // どちらも同じくこの2択から始まる
  onSubmit: (name: string | null) => void;
};

// プレイヤー自身・村人の名づけで共用する入力モーダル。StoryDialogue（クリックで
// 1行ずつ進むだけの会話ウィンドウ）とは別に、実際にテキストを打ち込ませたり
// 選択肢を出したりする必要があるためフォーム部品を持つ専用コンポーネントにしてある。
export function NamingModal({ open, message, onSubmit }: NamingModalProps) {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");

  // openが変わった直後、次に開いたときは選択肢からやり直せるように状態をリセットする
  // （StoryDialogueのresetKeyと同じ「レンダー中に前回値と比べて直接更新する」やり方）
  const [resetKey, setResetKey] = useState(open);
  if (resetKey !== open) {
    setResetKey(open);
    if (open) {
      setShowInput(false);
      setValue("");
    }
  }

  if (!open) return null;

  const trimmed = value.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className={cn(dotFont.className, "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4")}>
      <Card className="max-w-md w-full bg-slate-950/90 text-white">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">{message}</p>

          {showInput ? (
            <>
              <Input
                autoFocus
                value={value}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder="なまえを にゅうりょく"
              />
              <Button disabled={!trimmed} onClick={submit}>
                けってい
              </Button>
            </>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => setShowInput(true)}>名づける</Button>
              <Button variant="secondary" onClick={() => onSubmit(null)}>
                このままにする
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
