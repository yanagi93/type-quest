"use client";

import { Button } from "@/components/ui/8bit/button";
import { ITEM_ATTACK_BONUS, ITEM_DEFENSE_BONUS } from "../battle/difficulty";

type InventoryProps = {
  attackBooks: number;
  defenseBooks: number;
  hpBooks: number;
  potions: number;
  canUseHpBook: boolean;
  canUsePotion: boolean;
  onUseHpBook: () => void;
  onUsePotion: () => void;
};

// 手に入れたアイテムだけを並べる持ち物一覧（持ち物タブの中身）。
// 0個のものはそもそも表示しない。攻撃力・防御力の書はボス戦開始時に自動で
// 効果が乗る持ち越し型、体力の書・ポーションはこの画面から「使う」ボタンで
// 使う消費型（使うタイミングをプレイヤーが選べる）
export function Inventory({
  attackBooks,
  defenseBooks,
  hpBooks,
  potions,
  canUseHpBook,
  canUsePotion,
  onUseHpBook,
  onUsePotion,
}: InventoryProps) {
  const attackBonusPercent = Math.round(attackBooks * ITEM_ATTACK_BONUS * 100);
  const defenseBonusPercent = Math.round(defenseBooks * ITEM_DEFENSE_BONUS * 100);

  const hasAnyItem = attackBooks > 0 || defenseBooks > 0 || hpBooks > 0 || potions > 0;

  if (!hasAnyItem) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        まだ何も持っていない。村の樽や村人を探してみよう。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {attackBooks > 0 && (
        <div className="border-2 rounded-md p-3 flex items-center gap-3 border-gray-500/50">
          <span className="text-3xl">📕</span>
          <div className="flex-1">
            <p className="font-bold">攻撃力の書 × {attackBooks}</p>
            <p className="text-xs text-muted-foreground">
              ボス戦の攻撃力 +{attackBonusPercent}%
            </p>
          </div>
        </div>
      )}

      {defenseBooks > 0 && (
        <div className="border-2 rounded-md p-3 flex items-center gap-3 border-gray-500/50">
          <span className="text-3xl">📗</span>
          <div className="flex-1">
            <p className="font-bold">防御力の書 × {defenseBooks}</p>
            <p className="text-xs text-muted-foreground">
              ボス戦の被ダメージ -{defenseBonusPercent}%
            </p>
          </div>
        </div>
      )}

      {hpBooks > 0 && (
        <div className="border-2 rounded-md p-3 flex items-center gap-3 border-gray-500/50">
          <span className="text-3xl">📘</span>
          <div className="flex-1">
            <p className="font-bold">体力の書 × {hpBooks}</p>
            <p className="text-xs text-muted-foreground">使うとさいだいHPが上がり、全回復する</p>
          </div>
          <Button disabled={!canUseHpBook} onClick={onUseHpBook}>
            使う
          </Button>
        </div>
      )}

      {potions > 0 && (
        <div className="border-2 rounded-md p-3 flex items-center gap-3 border-gray-500/50">
          <span className="text-3xl">🧪</span>
          <div className="flex-1">
            <p className="font-bold">ポーション × {potions}</p>
            <p className="text-xs text-muted-foreground">使うとHPが少し回復する</p>
          </div>
          <Button disabled={!canUsePotion} onClick={onUsePotion}>
            使う
          </Button>
        </div>
      )}
    </div>
  );
}
