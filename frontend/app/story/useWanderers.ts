"use client";

import { useEffect, useRef, useState } from "react";
import type { GridMap, Interactable, WandererDefinition } from "./types";

// 歩き回るNPCが移動を試みる間隔。主人公の移動（GridExplorer.tsxのSTEP_INTERVAL_MS）
// より少しゆっくりにして、みんなが一斉にせわしなく動き回らないようにしている
const WANDER_INTERVAL_MS = 900;
// 毎回のタイミングで実際に1マス移動する確率。ずっと動き続けるより、
// 立ち止まったり歩いたりするほうが自然に見える
const WANDER_MOVE_CHANCE = 0.5;

type Pos = { x: number; y: number };

// 村を歩き回るNPC（村人・猫・犬など）の現在位置を管理するフック。
// 一定間隔でランダムな方向へ1マスの移動を試み、以下には進まない：
// ・壁のマス
// ・spawnX, spawnYからwanderRadiusより遠いマス
// ・主人公が今いるマス
// ・他の歩き回るNPCが今いるマス
// isLockedがtrueの間（会話中など）は全員その場に止まる。
// 戻り値はGridExplorerにそのまま渡せるInteractable[]（現在位置込み）。
export function useWanderers(
  definitions: WandererDefinition[],
  map: GridMap,
  playerPos: Pos,
  isLocked: boolean
): Interactable[] {
  const [positions, setPositions] = useState<Record<string, Pos>>(() => {
    const initial: Record<string, Pos> = {};

    for (const def of definitions) initial[def.id] = { x: def.spawnX, y: def.spawnY };

    return initial;
  });

  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isLockedRef.current) return;

      const current = positionsRef.current;
      const occupied = new Set(Object.values(current).map((p) => `${p.x},${p.y}`));
      const next: Record<string, Pos> = { ...current };
      let changed = false;

      for (const def of definitions) {
        if (Math.random() > WANDER_MOVE_CHANCE) continue;

        const pos = current[def.id] ?? { x: def.spawnX, y: def.spawnY };
        const directions = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];

        // 毎回同じ方向に偏らないよう、試す順番をシャッフルする
        for (let i = directions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));

          [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (const { dx, dy } of directions) {
          const target = { x: pos.x + dx, y: pos.y + dy };
          const distFromSpawn = Math.abs(target.x - def.spawnX) + Math.abs(target.y - def.spawnY);

          if (distFromSpawn > def.wanderRadius) continue;

          if (
            target.y < 0 ||
            target.y >= map.tiles.length ||
            target.x < 0 ||
            target.x >= map.tiles[0].length
          ) {
            continue;
          }

          if (map.tiles[target.y][target.x] === "wall") continue;
          if (target.x === playerPosRef.current.x && target.y === playerPosRef.current.y) continue;

          const key = `${target.x},${target.y}`;

          if (occupied.has(key)) continue;

          occupied.delete(`${pos.x},${pos.y}`);
          occupied.add(key);
          next[def.id] = target;
          changed = true;
          break;
        }
      }

      if (changed) setPositions(next);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, WANDER_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [definitions, map]);

  return definitions.map((def) => {
    const pos = positions[def.id] ?? { x: def.spawnX, y: def.spawnY };

    return {
      id: def.id,
      x: pos.x,
      y: pos.y,
      kind: def.kind,
      label: def.label,
      image: def.image,
      widthTiles: def.widthTiles,
      heightTiles: def.heightTiles,
      teachesWord: def.teachesWord,
      grantsItem: def.grantsItem,
      dialogue: def.dialogue,
    };
  });
}
