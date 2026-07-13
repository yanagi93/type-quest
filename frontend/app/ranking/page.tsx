"use client";

import { useEffect, useState } from "react";
import { DotGothic16 } from "next/font/google";
import { HomeButton } from "@/components/HomeButton";
import { Card } from "@/components/ui/8bit/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

type Entry = { userName: string; score: number; floor: number; mode: string; level: string | null };

const MODE_TABS: { key: string; label: string }[] = [
  { key: "practice", label: "試練の塔" },
  { key: "story", label: "ストーリー" },
];

// backend/（Express、GET /api/scores/leaderboard）からスコア上位者を取得して表示する。
// ログインしていなくても閲覧はできる（自分のスコアを記録したい場合だけログインが必要、
// battle/page.tsx側の説明参照）
export default function RankingPage() {
  const [mode, setMode] = useState<string>("practice");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .getLeaderboard({ mode, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className={`${dotFont.className} relative w-screen min-h-screen bg-slate-900 flex flex-col items-center gap-6 py-10`}>
      <HomeButton />

      <Card className="text-2xl px-8 py-4 bg-black/60 border-2 border-cyan-400 text-cyan-300">
        ランキング
      </Card>

      <div className="flex gap-3">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={cn(
              "px-4 py-2 rounded border-2 text-white transition",
              mode === tab.key ? "bg-yellow-500/80 border-yellow-300" : "bg-black/40 border-white/30"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="w-[600px] max-w-[90vw] p-6 bg-white/90">
        {loading && <p className="text-center">読み込み中…</p>}
        {!loading && error && <p className="text-center text-red-600">ランキングの取得に失敗しました。</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="text-center text-gray-500">まだ記録がありません。</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-300 text-sm text-gray-500">
                <th className="py-2 w-12">順位</th>
                <th className="py-2">プレイヤー</th>
                <th className="py-2 text-right">スコア</th>
                <th className="py-2 text-right">到達階</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={`${entry.userName}-${i}`} className="border-b border-gray-200">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{entry.userName}</td>
                  <td className="py-2 text-right">{entry.score}</td>
                  <td className="py-2 text-right">{entry.floor}F</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
