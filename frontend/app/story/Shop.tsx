"use client";

import { Card } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { cn } from "@/lib/utils";
import type { EquipmentTier } from "./chapter2Data";

type ShopProps = {
  open: boolean;
  title: string;
  gold: number;
  // 今の段階（0＝何も買っていない）。tiers[currentTier]が次に買える段階
  currentTier: number;
  tiers: EquipmentTier[];
  onBuy: (nextTier: number) => void;
  onClose: () => void;
};

// 武器屋・防具屋で共用するショップ画面。買い替え式（Interactable.shopType参照）なので、
// 一覧には常に「今持っている段階」と「次に買える段階」だけを分かりやすく出す
// （まだ買っていない先の段階は、値段だけ薄く見せてお楽しみにしておく）
export function Shop({ open, title, gold, currentTier, tiers, onBuy, onClose }: ShopProps) {
  if (!open) return null;

  const owned = currentTier > 0 ? tiers[currentTier - 1] : null;
  const next = currentTier < tiers.length ? tiers[currentTier] : null;
  const canAffordNext = next !== null && gold >= next.cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="max-w-md w-full bg-slate-950/90 text-white">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{title}</p>
            <p className="text-yellow-300 text-sm">💰 {gold}</p>
          </div>

          {owned && (
            <p className="text-xs text-cyan-300">
              今の装備：{owned.name}（{owned.description}）
            </p>
          )}

          <div className="flex flex-col gap-2">
            {tiers.map((tier, i) => {
              const tierNumber = i + 1;
              const isOwned = tierNumber <= currentTier;
              const isNext = tierNumber === currentTier + 1;

              return (
                <div
                  key={tier.name}
                  className={cn(
                    "border-2 rounded-md p-3",
                    isOwned && "border-cyan-400/70 bg-cyan-950/20",
                    isNext && !isOwned && "border-yellow-400/70",
                    !isOwned && !isNext && "border-gray-600/50 opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{tier.name}</p>
                    <p className="text-sm">{isOwned ? "所持ずみ" : `💰 ${tier.cost}`}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>

                  {isNext && !isOwned && (
                    <Button
                      className="mt-2"
                      disabled={!canAffordNext}
                      onClick={() => onBuy(tierNumber)}
                    >
                      {canAffordNext ? "買う" : "お金が足りない"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {next === null && (
            <p className="text-xs text-muted-foreground">これ以上、良い装備は無いようだ。</p>
          )}

          <Button variant="secondary" onClick={onClose}>
            店を出る
          </Button>
        </div>
      </Card>
    </div>
  );
}
