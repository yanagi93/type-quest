"use client";

import { ITEM_ATTACK_BONUS, ITEM_DEFENSE_BONUS } from "../battle/difficulty";

type StatusProps = {
  playerHp: number;
  maxPlayerHp: number;
  attackBooks: number;
  defenseBooks: number;
  wordsLearnedCount: number;
  wordDictionaryCount: number;
  requiredLearnedCount: number;
  bossUnlockWordCount: number;
};

// 主人公の今の状態をまとめて見せるステータスタブの中身
export function Status({
  playerHp,
  maxPlayerHp,
  attackBooks,
  defenseBooks,
  wordsLearnedCount,
  wordDictionaryCount,
  requiredLearnedCount,
  bossUnlockWordCount,
}: StatusProps) {
  const attackBonusPercent = Math.round(attackBooks * ITEM_ATTACK_BONUS * 100);
  const defenseBonusPercent = Math.round(defenseBooks * ITEM_DEFENSE_BONUS * 100);

  const rows: { label: string; value: string }[] = [
    { label: "HP", value: `${playerHp} / ${maxPlayerHp}` },
    { label: "攻撃力ボーナス（ボス戦）", value: `+${attackBonusPercent}%` },
    { label: "被ダメージ軽減（ボス戦）", value: `-${defenseBonusPercent}%` },
    { label: "おぼえた言葉", value: `${wordsLearnedCount} / ${wordDictionaryCount}` },
    { label: "ボス解放条件", value: `${requiredLearnedCount} / ${bossUnlockWordCount}` },
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between border-2 rounded-md p-3 border-gray-500/50"
        >
          <p className="text-sm text-muted-foreground">{row.label}</p>
          <p className="font-bold">{row.value}</p>
        </div>
      ))}
    </div>
  );
}
