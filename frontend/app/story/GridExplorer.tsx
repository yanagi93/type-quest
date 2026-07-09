"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GridMap, Interactable } from "./types";

// キーを押しっぱなしにしたときの1マス移動の間隔。
// OS標準のキーリピート（最初だけ長い遅延が入り、後から連打になる）に頼ると
// 動き出しがカクつくため、自前のintervalで一定間隔で移動させる。
const STEP_INTERVAL_MS = 140;
const DEFAULT_TILE_SIZE = 48;
const DIRECTION_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
type DirectionKey = (typeof DIRECTION_KEYS)[number];

type Pos = { x: number; y: number };

type GridExplorerProps = {
  map: GridMap;
  interactables: Interactable[];
  playerPos: Pos;
  onMove: (pos: Pos) => void;
  onBump: (interactable: Interactable) => void;
  onStepOntoFloor?: (pos: Pos) => void;
  isLocked?: boolean;
  tileSize?: number;
  // 用意できている場合は、マス目の色分けの代わりにこの画像をマップ全体の背景として敷く
  backgroundImageSrc?: string;
};

// 町・フィールド共通で使う、グリッド移動の探索コンポーネント。
// backgroundImageSrcが無い場合は、タイル絵の代わりに色付きdiv/絵文字で表現するプレースホルダー。
export function GridExplorer({
  map,
  interactables,
  playerPos,
  onMove,
  onBump,
  onStepOntoFloor,
  isLocked = false,
  tileSize = DEFAULT_TILE_SIZE,
  backgroundImageSrc,
}: GridExplorerProps) {
  // 押されている方向キー（押した順）。一番最後に押したキーの方向へ進む
  const heldKeysRef = useRef<DirectionKey[]>([]);
  const playerPosRef = useRef(playerPos);

  // "g"キーで、当たり判定を確認するためのデバッグ用グリッド表示を切り替える。
  // マップの座標を自分で編集したいときは、これをONにして
  // 「壁（赤）」「床（枠線のみ）」がどのマスに対応しているかを画像と重ねて確認できる
  const [showDebugGrid, setShowDebugGrid] = useState(false);

  useEffect(() => {
    const handleToggleGrid = (event: KeyboardEvent) => {
      if (event.key === "g" || event.key === "G") {
        setShowDebugGrid((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleToggleGrid);

    return () => window.removeEventListener("keydown", handleToggleGrid);
  }, []);

  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  useEffect(() => {
    const step = () => {
      if (isLocked) return;

      const key = heldKeysRef.current[heldKeysRef.current.length - 1];

      if (!key) return;

      let dx = 0;
      let dy = 0;

      if (key === "ArrowUp") dy = -1;
      else if (key === "ArrowDown") dy = 1;
      else if (key === "ArrowLeft") dx = -1;
      else if (key === "ArrowRight") dx = 1;

      const pos = playerPosRef.current;
      const target = { x: pos.x + dx, y: pos.y + dy };

      if (
        target.y < 0 ||
        target.y >= map.tiles.length ||
        target.x < 0 ||
        target.x >= map.tiles[0].length
      ) {
        return;
      }

      if (map.tiles[target.y][target.x] === "wall") return;

      const blocking = interactables.find(
        (i) => i.x === target.x && i.y === target.y
      );

      if (blocking) {
        onBump(blocking);
        return;
      }

      // Reactの再レンダーを待たずに、次のintervalがすぐ最新位置を使えるようにする
      // （再レンダーが少しでも遅れると、そのぶん歩く速度が遅く感じられてしまうため）
      playerPosRef.current = target;
      onMove(target);
      onStepOntoFloor?.(target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!DIRECTION_KEYS.includes(event.key as DirectionKey)) return;

      event.preventDefault();

      if (event.repeat) return; // リピートはこちらのintervalで処理するので無視

      const key = event.key as DirectionKey;

      if (!heldKeysRef.current.includes(key)) {
        heldKeysRef.current.push(key);
      }

      if (!isLocked) step(); // 押した瞬間にすぐ1マス動かす（レスポンスを良くする）
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!DIRECTION_KEYS.includes(event.key as DirectionKey)) return;

      heldKeysRef.current = heldKeysRef.current.filter((k) => k !== event.key);
    };

    const handleBlur = () => {
      heldKeysRef.current = [];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    const interval = window.setInterval(step, STEP_INTERVAL_MS);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.clearInterval(interval);
    };
  }, [map, interactables, onMove, onBump, onStepOntoFloor, isLocked]);

  // ロックされた瞬間（会話が開いた等）は押しっぱなし状態をリセットしておく
  useEffect(() => {
    if (isLocked) heldKeysRef.current = [];
  }, [isLocked]);

  const width = map.tiles[0].length;
  const height = map.tiles.length;

  return (
    <div
      className="relative bg-green-950"
      style={{ width: width * tileSize, height: height * tileSize }}
    >
      {backgroundImageSrc ? (
        <Image
          src={backgroundImageSrc}
          alt=""
          fill
          className="object-cover pointer-events-none select-none"
          priority
        />
      ) : (
        map.tiles.map((row, y) =>
          row.map((tile, x) => (
            <div
              key={`${x}-${y}`}
              className={
                tile === "wall"
                  ? "absolute bg-gray-800 border border-gray-900"
                  : "absolute bg-green-700 border border-green-800/50"
              }
              style={{
                left: x * tileSize,
                top: y * tileSize,
                width: tileSize,
                height: tileSize,
              }}
            />
          ))
        )
      )}

      {interactables.map((interactable) =>
        interactable.label ? (
          <div
            key={interactable.id}
            className="absolute flex items-center justify-center text-2xl"
            style={{
              left: interactable.x * tileSize,
              top: interactable.y * tileSize,
              width: tileSize,
              height: tileSize,
            }}
          >
            {interactable.label}
          </div>
        ) : null
      )}

      <div
        className="absolute flex items-center justify-center text-2xl ease-linear"
        style={{
          left: playerPos.x * tileSize,
          top: playerPos.y * tileSize,
          width: tileSize,
          height: tileSize,
          transitionProperty: "left, top",
          transitionDuration: `${STEP_INTERVAL_MS}ms`,
        }}
      >
        🧑
      </div>

      {/*
        当たり判定デバッグ表示（gキーでON/OFF）。
        壁マスは赤く半透明に塗り、床マスは緑の枠線だけ表示することで、
        背景画像に重ねたまま「どのマスが壁/床になっているか」を目で確認できるようにする。
        一番上の行と一番左の列にマス番号（列番号・行番号）を表示するので、
        chapter1Data.tsのTOWN_FLOOR_ROWSの何文字目・何行目を直せばいいか分かる。
      */}
      {showDebugGrid && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {map.tiles.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`debug-${x}-${y}`}
                className={
                  tile === "wall"
                    ? "absolute bg-red-500/40 border border-red-300/70"
                    : "absolute border border-green-300/50"
                }
                style={{
                  left: x * tileSize,
                  top: y * tileSize,
                  width: tileSize,
                  height: tileSize,
                }}
              >
                {y === 0 && (
                  <span className="absolute -top-4 left-0 text-[10px] text-yellow-300 font-bold">
                    {x}
                  </span>
                )}
                {x === 0 && (
                  <span className="absolute top-0 -left-4 text-[10px] text-yellow-300 font-bold">
                    {y}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
