"use client";

import { useEffect, useRef } from "react";
import type { FloorTileType, PlacedObject } from "./types";

type FieldMapViewProps = {
  floorTextures: FloorTileType[][];
  // 木・山・建物などの置物。地形の色だけだと単調なので、この上に小さく重ねて
  // 描き、遠目にも「森」「山」「町」の見分けがつくようにする（見た目だけの
  // 表示で、当たり判定には使わない）
  objects: PlacedObject[];
  // フィールド上の座標系でのプレイヤー位置。村・砂漠の町など、フィールドとは
  // 別の縮尺のマップにいる間はnull（現在地マーカーを出さない。村の座標を
  // そのままフィールドの縮尺に置くと、全く違う場所を指してしまうため）
  playerPos: { x: number; y: number } | null;
  // 次に目指すべき場所（ミッション性を出すため、黄色いリングで示す）。
  // 目指す場所が無い（＝この章でやることが無い）ときはnull
  objective: { x: number; y: number } | null;
};

// マップエディタの「全体表示にズーム」と同じ縮小地図を、村人からもらった
// 「持ち歩ける地図」としてメニューに出す。実際のタイル絵をそのまま縮小すると
// 128×96マスぶんの画像を並べることになり重いので、地形タイプごとの色を
// 敷き詰めたcanvasで代用する（ドラクエ風ワールドマップの雰囲気を軽量に再現する狙い）
const PX_PER_TILE = 4;

const FLOOR_COLORS: Record<FloorTileType, string> = {
  grass: "#4a7c3c",
  dirt: "#8a6a42",
  water: "#3a6ea8",
  sand: "#d8c37a",
  stone: "#8b8b8b",
  forest: "#2f5c2a",
  lake: "#3a6ea8",
  river: "#4a7fbb",
  mudPattern: "#6b5334",
  mudPlain: "#6b5334",
  sandPattern: "#d8c37a",
  sandPlain: "#d8c37a",
  pondA1: "#4a7c3c",
  pondA2: "#4a86a0",
  pondA3: "#3f7fb0",
  pondA4: "#3a6ea8",
  pondB1: "#4a7c3c",
  pondB2: "#4a86a0",
  pondB3: "#3f7fb0",
  pondB4: "#3a6ea8",
  floorAccentBlue: "#3a6ea8",
  floorAccentTeal: "#3d8b8b",
  floorAccentBrownSpeckle: "#8a6a42",
  floorAccentTanSpeckle: "#d8c37a",
  floorAccentGraySpeckle: "#8b8b8b",
  floorAccentTealDarkSpeckle: "#2d6b6b",
  floorAccentCyanSparkle: "#5bb8c9",
  floorAccentPurpleSparkle: "#8a6bb0",
  floorAccentFlower: "#5f9c4a",
};

// 置物の画像ファイル名から、地図上でどんな色の粒として見せるかをざっくり判定する。
// 種類ごとに専用アイコンを用意する余裕は無いので、色の傾向だけ合わせている
function objectMarkerColor(image: string): string | null {
  const name = image.toLowerCase();

  if (name.includes("mountain")) return "#5c5650";
  if (name.includes("tree") || name.includes("forest")) return "#1f3d1a";
  if (name.includes("dune") || name.includes("sand")) return null; // 砂地の色とほぼ同化するので省略
  if (
    name.includes("icon_") ||
    name.includes("/ie.png") ||
    name.includes("tower") ||
    name.includes("blacksmith") ||
    name.includes("castle")
  ) {
    return "#a83232"; // 建物・目印になる構造物は目立つ色にする
  }

  return "#3a3a3a"; // その他の置物（岩・柵など）は控えめな暗いグレー
}

export function FieldMapView({ floorTextures, objects, playerPos, objective }: FieldMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = floorTextures.length;
  const cols = floorTextures[0]?.length ?? 0;
  const width = cols * PX_PER_TILE;
  const height = rows * PX_PER_TILE;

  // 地形は章の間ずっと同じ（floorTexturesの中身自体は変わらない）ので、
  // canvasへの描画は初回だけでよい。1マスずつfillRectするだけの軽い処理だが、
  // 毎レンダー描き直す必要は無いのでuseEffectの依存配列で絞ってある
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isWater = (x: number, y: number) => {
      const t = floorTextures[y]?.[x];
      return t === "water" || t === "lake" || t === "river" || t?.startsWith("pond");
    };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = FLOOR_COLORS[floorTextures[y][x]] ?? FLOOR_COLORS.grass;
        ctx.fillRect(x * PX_PER_TILE, y * PX_PER_TILE, PX_PER_TILE, PX_PER_TILE);

        // ベタ塗りだけだと地形の境目がのっぺりして地図らしさに欠けるため、
        // 軽い一手間を2つ加える（どちらも見た目だけの演出で、当たり判定には無関係）。
        // ①簡易的な疑似乱数でタイルごとにわずかな明暗を付け、単調なベタ塗りを崩す
        const noise = ((x * 928371 + y * 12345 + 7) % 11) - 5; // -5〜5の範囲
        ctx.fillStyle = noise >= 0 ? `rgba(255,255,255,${noise / 60})` : `rgba(0,0,0,${-noise / 60})`;
        ctx.fillRect(x * PX_PER_TILE, y * PX_PER_TILE, PX_PER_TILE, PX_PER_TILE);

        // ②陸と海の境目だけ少し濃い縁取りを入れて「海岸線」を目立たせる
        if (!isWater(x, y)) {
          const nearWater =
            isWater(x - 1, y) || isWater(x + 1, y) || isWater(x, y - 1) || isWater(x, y + 1);

          if (nearWater) {
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.fillRect(x * PX_PER_TILE, y * PX_PER_TILE, PX_PER_TILE, PX_PER_TILE);
          }
        }
      }
    }

    // 木・山・建物などの置物を、種類ごとの色の小さな点として地形の上に重ねる。
    // 実際の画像をそのまま縮小するのは重い＆このスケールでは潰れて見えないので、
    // objectMarkerColorで大まかな色分けだけする（groundLevel=trueの花のような
    // 装飾は地図の縮尺では見分けがつかないほど小さいので対象外にしている）
    for (const object of objects) {
      if (object.groundLevel) continue;

      const color = objectMarkerColor(object.image);

      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(object.x * PX_PER_TILE, object.y * PX_PER_TILE, PX_PER_TILE, PX_PER_TILE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorTextures, objects]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        長老からもらった、世界の地図。黄色く光る場所が、次に目指す場所の目印。
      </p>
      <div
        className="relative border-2 border-gray-500/50 rounded-md overflow-hidden mx-auto"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />

        {/*
          主人公の現在地マーカー（フィールド上にいるときだけ）。
          修正済み：以前は直径6px・枠2pxだったため、中の白い部分が2px四方しか残らず
          ほぼ黒い点にしか見えなかった。目立つ赤色に変え、一回り大きくした
        */}
        {playerPos && (
          <div
            className="absolute rounded-full bg-red-500 border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2"
            style={{ left: playerPos.x * PX_PER_TILE, top: playerPos.y * PX_PER_TILE, width: 10, height: 10 }}
          />
        )}

        {/* 目的地の黄色いリング。Tailwind標準のanimate-pingで光っている感じを出す */}
        {objective && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: objective.x * PX_PER_TILE, top: objective.y * PX_PER_TILE, width: 16, height: 16 }}
          >
            <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-75 animate-ping" />
            <div className="relative w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-100" />
          </div>
        )}
      </div>
    </div>
  );
}
