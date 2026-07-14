"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FloorTileType, GridMap, Interactable, PlacedObject } from "./types";

// キーを押しっぱなしにしたときの1マス移動の間隔。
// OS標準のキーリピート（最初だけ長い遅延が入り、後から連打になる）に頼ると
// 動き出しがカクつくため、自前のintervalで一定間隔で移動させる。
const STEP_INTERVAL_MS = 140;
const DEFAULT_TILE_SIZE = 48;
const DIRECTION_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
type DirectionKey = (typeof DIRECTION_KEYS)[number];

type Pos = { x: number; y: number };

const DEFAULT_VIEWPORT_WIDTH = 800;
const DEFAULT_VIEWPORT_HEIGHT = 560;

// 床の種類ごとの画像パス。どのマップでも共通で使う（chapter1に限らない汎用アセット）。
// sand/stoneは切り出したタイル素材（public/images/map/okimono/tileset/）を使う
const FLOOR_TILE_IMAGES: Record<FloorTileType, string> = {
  // grass/dirtは、縁タイル（EDGE_TILE_IMAGES）と同じ色味に揃えた新しいタイル素材に
  // 差し替えた（以前のkusa.png/tuti.pngは色味が違い、縁タイルとの境目が目立っていたため）
  grass: "/images/map/okimono/tileset/floor_grass.png",
  dirt: "/images/map/okimono/tileset/floor_dirt_brown.png",
  water: "/images/map/okimono/tileset/floor_water_blue.png",
  sand: "/images/map/okimono/tileset/floor_sand_beige.png",
  stone: "/images/map/okimono/tileset/floor_stone_gray.png",
};

// 草と接する境界だけ、ベタ画像の代わりに敷く「縁」タイル。上下左右それぞれの方向に、
// その方向のマスが草のときに使う専用画像がある（石には縁タイルを用意していない）。
// これにより、土の道・砂地・水面が草に接する場所だけ自然な繋ぎ目に見えるようになる
// （resolveFloorImages参照）
type EdgeDirection = "top" | "bottom" | "left" | "right";
const EDGE_TILE_IMAGES: Partial<Record<FloorTileType, Record<EdgeDirection, string>>> = {
  dirt: {
    top: "/images/map/okimono/tileset/texture_mud_straight_top.png",
    bottom: "/images/map/okimono/tileset/texture_mud_straight_bottom.png",
    left: "/images/map/okimono/tileset/texture_mud_straight_left.png",
    right: "/images/map/okimono/tileset/texture_mud_straight_right.png",
  },
  sand: {
    top: "/images/map/okimono/tileset/texture_sand_straight_top.png",
    bottom: "/images/map/okimono/tileset/texture_sand_straight_bottom.png",
    left: "/images/map/okimono/tileset/texture_sand_straight_left.png",
    right: "/images/map/okimono/tileset/texture_sand_straight_right.png",
  },
  water: {
    top: "/images/map/okimono/tileset/texture_water_straight_top.png",
    bottom: "/images/map/okimono/tileset/texture_water_straight_bottom.png",
    left: "/images/map/okimono/tileset/texture_water_straight_left.png",
    right: "/images/map/okimono/tileset/texture_water_straight_right.png",
  },
};

// 花入りの草タイル（ファイル名はdirtだが、実際は花の模様が入った草タイル。
// 色味は普通の草タイルと同じ緑なので違和感なく混ぜられる）。
// 草マスのうち、このくらいの割合をこのタイルに差し替えて、単調な緑の繰り返しに
// 見えないようにする
const GRASS_FLOWER_IMAGE = "/images/map/okimono/tileset/floor_dirt_light_flower.png";
const FLOWER_GRASS_CHANCE = 0.12;

// マス目の座標から、レンダーのたびに変わらない決定的な「乱数っぽい」値を作る
// （Math.randomだと再レンダーのたびにどのマスが花になるか変わってチカチカして
// しまうため、座標だけで決まるハッシュ関数にしてある）
function pseudoRandom(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// floorTexturesから、実際に敷く画像パスの2次元配列を作る。草以外のマスは、
// 隣（上下左右）が草なら、その方向の縁タイルに差し替える。隣が草でなければ
// 通常のベタ画像のまま。複数方向が同時に草のとき（角など）は、上→下→左→右の
// 優先順で1方向だけ縁タイルにする（縁タイルは1方向分の柄しか無いため、完全に
// 自然に見えるのは1方向だけ草に接しているときだけだが、複数方向のケースでも
// 「どこかの方向だけ縁になる」だけで見た目が崩れるわけではない）
function resolveFloorImages(floorTextures: FloorTileType[][]): string[][] {
  const height = floorTextures.length;
  const width = floorTextures[0]?.length ?? 0;

  return floorTextures.map((row, y) =>
    row.map((floorType, x) => {
      const edges = EDGE_TILE_IMAGES[floorType];

      if (!edges) {
        if (floorType === "grass" && pseudoRandom(x, y) < FLOWER_GRASS_CHANCE) {
          return GRASS_FLOWER_IMAGE;
        }

        return FLOOR_TILE_IMAGES[floorType];
      }

      const up = y > 0 ? floorTextures[y - 1][x] : undefined;
      const down = y < height - 1 ? floorTextures[y + 1][x] : undefined;
      const left = x > 0 ? floorTextures[y][x - 1] : undefined;
      const right = x < width - 1 ? floorTextures[y][x + 1] : undefined;

      if (up === "grass") return edges.top;
      if (down === "grass") return edges.bottom;
      if (left === "grass") return edges.left;
      if (right === "grass") return edges.right;

      return FLOOR_TILE_IMAGES[floorType];
    })
  );
}

// 主人公の向きごとの画像。矢印キーを押した方向に合わせて差し替える
type FacingDirection = "up" | "down" | "left" | "right";
const PLAYER_IMAGES: Record<FacingDirection, string> = {
  down: "/images/map/syuzinkou/syoumen.png",
  up: "/images/map/syuzinkou/usiro.png",
  left: "/images/map/syuzinkou/hidari.png",
  right: "/images/map/syuzinkou/migi.png",
};
const DIRECTION_KEY_TO_FACING: Record<DirectionKey, FacingDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type GridExplorerProps = {
  map: GridMap;
  interactables: Interactable[];
  // 会話や当たり判定を持たない、見た目だけの置物（木・花・柵など）
  objects?: PlacedObject[];
  playerPos: Pos;
  onMove: (pos: Pos) => void;
  onBump: (interactable: Interactable) => void;
  onStepOntoFloor?: (pos: Pos) => void;
  isLocked?: boolean;
  tileSize?: number;
  // 用意できている場合は、色分けの代わりにマスごとに床画像（草・土・水）を敷く
  floorTextures?: FloorTileType[][];
  // 画面に一度に表示する範囲（px）。マップ全体がこれより大きい場合は
  // 主人公を中心にカメラが追従し、マップの端まで行くとそこで止まる
  viewportWidth?: number;
  viewportHeight?: number;
};

// 町・フィールド共通で使う、グリッド移動の探索コンポーネント。
// floorTexturesが無い場合は、タイル絵の代わりに色付きdivで表現するプレースホルダー。
export function GridExplorer({
  map,
  interactables,
  objects = [],
  playerPos,
  onMove,
  onBump,
  onStepOntoFloor,
  isLocked = false,
  tileSize = DEFAULT_TILE_SIZE,
  floorTextures,
  viewportWidth = DEFAULT_VIEWPORT_WIDTH,
  viewportHeight = DEFAULT_VIEWPORT_HEIGHT,
}: GridExplorerProps) {
  // 縁タイルの解決はマップ全体ぶん（数千マス）を毎回計算するのは無駄なので、
  // floorTexturesの参照が変わったとき（マップ・シーン切り替え時）だけ計算し直す
  const resolvedFloorImages = useMemo(
    () => (floorTextures ? resolveFloorImages(floorTextures) : null),
    [floorTextures]
  );

  // 押されている方向キー（押した順）。一番最後に押したキーの方向へ進む
  const heldKeysRef = useRef<DirectionKey[]>([]);
  const playerPosRef = useRef(playerPos);

  // "g"キーで、当たり判定を確認するためのデバッグ用グリッド表示を切り替える。
  // マップの座標を自分で編集したいときは、これをONにして
  // 「壁（赤）」「床（枠線のみ）」がどのマスに対応しているかを画像と重ねて確認できる
  const [showDebugGrid, setShowDebugGrid] = useState(false);

  // 主人公の向き（最後に押した矢印キーの方向）。壁にぶつかって動けない場合でも
  // 向きだけは変わるようにする（体当たりしたときにちゃんとそっちを向く）
  const [facing, setFacing] = useState<FacingDirection>("down");

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

      setFacing(DIRECTION_KEY_TO_FACING[key]);

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

      // ぶつかり判定はinteractionX/Y（未指定ならx, y）を基準にする。
      // 家のように画像の見た目の中心とドアの位置がズレているものは、
      // interactionX/Yだけドアの実際の位置に合わせてあることがある
      const blocking = interactables.find(
        (i) => (i.interactionX ?? i.x) === target.x && (i.interactionY ?? i.y) === target.y
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
  const mapPixelWidth = width * tileSize;
  const mapPixelHeight = height * tileSize;

  // カメラ（画面に表示する範囲）を主人公中心に追従させつつ、
  // マップの端より外は映らないようにクランプ（範囲を制限）する。
  // 主人公のマス中心が画面のちょうど真ん中に来るように計算し、
  // それがマップの外にはみ出す場合だけ、マップの端で止める。
  const playerCenterX = playerPos.x * tileSize + tileSize / 2;
  const playerCenterY = playerPos.y * tileSize + tileSize / 2;
  const maxCameraX = Math.max(0, mapPixelWidth - viewportWidth);
  const maxCameraY = Math.max(0, mapPixelHeight - viewportHeight);
  const cameraX = Math.min(
    Math.max(playerCenterX - viewportWidth / 2, 0),
    maxCameraX
  );
  const cameraY = Math.min(
    Math.max(playerCenterY - viewportHeight / 2, 0),
    maxCameraY
  );

  // 画面に映る範囲＋余白ぶんのマスだけを描画対象にする（ビューポートカリング）。
  // 以前は町全体（48×44＝2000マス超）を毎回まるごと描画していたため、1歩動くたびに
  // 画面外の大量のタイル・木・花・徘徊NPCまで含めて再計算されて動きがカクついていた。
  // 余白（BUFFER_TILES）は、家（6マス）や洞窟（7マス）のように足元の座標から
  // 見た目が大きくはみ出す置物が、画面の縁でいきなり消えたり出現したりしないための
  // マージン兼、カメラが滑らかに動いている間の縁の見切れ対策
  const BUFFER_TILES = 8;
  const startCol = Math.max(0, Math.floor(cameraX / tileSize) - BUFFER_TILES);
  const endCol = Math.min(width, Math.ceil((cameraX + viewportWidth) / tileSize) + BUFFER_TILES);
  const startRow = Math.max(0, Math.floor(cameraY / tileSize) - BUFFER_TILES);
  const endRow = Math.min(height, Math.ceil((cameraY + viewportHeight) / tileSize) + BUFFER_TILES);

  const visibleLeft = startCol * tileSize;
  const visibleRight = endCol * tileSize;
  const visibleTop = startRow * tileSize;
  const visibleBottom = endRow * tileSize;

  const isFootprintVisible = (left: number, top: number, w: number, h: number) =>
    left + w > visibleLeft && left < visibleRight && top + h > visibleTop && top < visibleBottom;

  // 置物（家・井戸などのインタラクタブル＋見た目だけの木や花）と主人公をまとめて、
  // 「足元のマス（下端）」が上にあるものから順に描画する（＝Yソート）。
  // これにより、主人公が家の下側にいれば家より手前に、家の奥（上側）にいれば
  // 家より奥に表示され、上から見た遠近関係が自然に見えるようになる。
  type Sprite = {
    key: string;
    image: string;
    left: number;
    top: number;
    width: number;
    height: number;
    sortY: number;
  };

  const sprites: Sprite[] = [];
  // groundLevel: trueの置物（花など、背の低いもの）。Yソートせず、常に主人公の背景として
  // 床のすぐ上に敷く（主人公が上側にいても下側にいても、花の上を歩いているように見える）
  const groundSprites: Sprite[] = [];

  for (const interactable of interactables) {
    if (!interactable.image || !interactable.widthTiles || !interactable.heightTiles) continue;

    const w = interactable.widthTiles * tileSize;
    const h = interactable.heightTiles * tileSize;
    const left = (interactable.x + 0.5) * tileSize - w / 2;
    const top = (interactable.y + 1) * tileSize - h;

    if (!isFootprintVisible(left, top, w, h)) continue; // 画面外は描画しない（軽量化）

    sprites.push({
      key: `interactable-${interactable.id}`,
      image: interactable.image,
      left,
      top,
      width: w,
      height: h,
      sortY: interactable.y,
    });
  }

  for (const object of objects) {
    const w = object.widthTiles * tileSize;
    const h = object.heightTiles * tileSize;
    const left = (object.x + 0.5) * tileSize - w / 2;
    const top = (object.y + 1) * tileSize - h;

    if (!isFootprintVisible(left, top, w, h)) continue; // 画面外は描画しない（軽量化）

    const sprite: Sprite = {
      key: `object-${object.id}`,
      image: object.image,
      left,
      top,
      width: w,
      height: h,
      sortY: object.y,
    };

    if (object.groundLevel) {
      groundSprites.push(sprite);
    } else {
      sprites.push(sprite);
    }
  }

  sprites.sort((a, b) => a.sortY - b.sortY);

  return (
    <div
      // isolate: 修正済みのバグ。Yソート用にスプライトへ付けたz-index（GridExplorer内の
      // 表示順を決めるための相対値で、マップが大きいほど大きな値になる。80台になることもある）が、
      // このコンポーネントの外側にある会話ウィンドウ（StoryDialogue.tsxのz-50オーバーレイ）
      // より大きくなってしまい、木や家のスプライトが会話ウィンドウの上に表示されてしまう
      // ことがあった。isolateで新しいスタッキングコンテキストを作ることで、内部のz-indexが
      // 外側の要素と競合しないように閉じ込めている
      className="relative isolate overflow-hidden bg-black mx-auto"
      style={{ width: viewportWidth, height: viewportHeight }}
    >
      <div
        className="absolute bg-green-950 ease-linear"
        style={{
          width: mapPixelWidth,
          height: mapPixelHeight,
          left: -cameraX,
          top: -cameraY,
          transitionProperty: "left, top",
          transitionDuration: `${STEP_INTERVAL_MS}ms`,
        }}
      >
      {/* 床レイヤー。floorTexturesがあればマスごとに草/土/水の画像を敷き詰め、無ければ色分けプレースホルダー。
          画面に映る範囲＋余白ぶんの行・列だけをslice()で切り出して描画する（ビューポートカリング） */}
      {floorTextures && resolvedFloorImages
        ? resolvedFloorImages.slice(startRow, endRow).map((row, rowIndex) => {
            const y = rowIndex + startRow;

            return row.slice(startCol, endCol).map((image, colIndex) => {
              const x = colIndex + startCol;

              return (
                <div
                  key={`floor-${x}-${y}`}
                  className="absolute"
                  style={{
                    left: x * tileSize,
                    top: y * tileSize,
                    width: tileSize,
                    height: tileSize,
                    backgroundImage: `url(${image})`,
                    backgroundSize: "100% 100%",
                    imageRendering: "pixelated",
                  }}
                />
              );
            });
          })
        : map.tiles.slice(startRow, endRow).map((row, rowIndex) => {
            const y = rowIndex + startRow;

            return row.slice(startCol, endCol).map((tile, colIndex) => {
              const x = colIndex + startCol;

              return (
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
              );
            });
          })}

      {/* 地面に貼りつく置物（花など。groundLevel: true）。Yソートせず、常に主人公より奥に敷く */}
      {groundSprites.map((sprite) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={sprite.key}
          src={sprite.image}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: sprite.left,
            top: sprite.top,
            width: sprite.width,
            height: sprite.height,
            imageRendering: "pixelated",
          }}
        />
      ))}

      {/* 絵文字プレースホルダーのインタラクタブル（imageを持たないもの。出口・ボス・
          専用スプライトが無い歩き回るNPCなど）。歩き回るNPCは位置が変わるので、
          主人公と同じtransitionでなめらかに移動して見えるようにしている
          （動かないものには単に効果がないだけ）。imageを持つものは下のYソート
          スプライトの方で描画するので、二重に表示しないようここでは除外する。
          画面外のものは描画しない（ビューポートカリング） */}
      {interactables.map((interactable) =>
        interactable.label &&
        !interactable.image &&
        isFootprintVisible(interactable.x * tileSize, interactable.y * tileSize, tileSize, tileSize) ? (
          <div
            key={interactable.id}
            className="absolute flex items-center justify-center text-2xl ease-linear"
            style={{
              left: interactable.x * tileSize,
              top: interactable.y * tileSize,
              width: tileSize,
              height: tileSize,
              transitionProperty: "left, top",
              transitionDuration: `${STEP_INTERVAL_MS}ms`,
            }}
          >
            {interactable.label}
          </div>
        ) : null
      )}

      {/*
        置物（image付きインタラクタブル＋見た目だけの木や花など）と主人公を、
        足元マスが上にあるものから順に「見える」ように重ねる（Yソート）。

        修正済みのバグ：以前はsprites配列を主人公のyで前半・後半に分け、DOM上の
        並び順（後に書いた要素が手前に出る）でYソートを表現していた。この方式だと、
        主人公が1マス上下に動くたびに「どのスプライトが前半/後半に属するか」が
        入れ替わり、Reactが該当スプライトのDOMノードを実際に別の位置へ移動させる
        （挿入し直す）必要があった。ノードの移動はブラウザにとって単なるスタイル
        変更より重く、進行中のCSSトランジション（滑らかな移動アニメーション）も
        その瞬間に中断されてしまうため、上下移動のときだけカクついて見えていた
        （左右移動はxしか変わらずYソートの前後関係が変わらないので、この問題が
        起きずスムーズだった）。
        対策として、DOM上の並び順は触らず（スプライト同士の並び順はどのみち
        お互いのsortYが変わらない限り不変）、CSSのz-indexだけでYソートを表現する
        方式に変えた。sprite側はsortY*2、主人公はplayerPos.y*2+1という値を使うことで、
        「sortYが主人公以下のスプライトは主人公より奥、より大きいスプライトは
        主人公より手前」という以前と同じ見た目を、DOMノードを一切動かさずに実現できる
        （React側はleft/top/zIndexのスタイル更新だけで済み、トランジションが途切れない）
      */}
      {sprites.map((sprite) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={sprite.key}
          src={sprite.image}
          alt=""
          className="absolute pointer-events-none select-none ease-linear"
          style={{
            left: sprite.left,
            top: sprite.top,
            width: sprite.width,
            height: sprite.height,
            zIndex: sprite.sortY * 2,
            imageRendering: "pixelated",
            // 歩き回るNPC（画像付き）が主人公と同じ速さでなめらかに移動して見えるように。
            // 動かない置物（家・木など）には単に効果がないだけ
            transitionProperty: "left, top",
            transitionDuration: `${STEP_INTERVAL_MS}ms`,
          }}
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PLAYER_IMAGES[facing]}
        alt=""
        className="absolute pointer-events-none select-none ease-linear"
        style={{
          left: playerPos.x * tileSize,
          top: playerPos.y * tileSize,
          width: tileSize,
          height: tileSize,
          zIndex: playerPos.y * 2 + 1,
          imageRendering: "pixelated",
          transitionProperty: "left, top",
          transitionDuration: `${STEP_INTERVAL_MS}ms`,
        }}
      />

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

          {/*
            置物（木・家・花など）の見た目の範囲を水色の枠で、
            足元マス（x, y。実際に指定する座標）を水色の点で表示する。
            画像が実際どのマスにまたがって表示されるかを見ながら
            TOWN_OBJECTS / TOWN_INTERACTABLESの座標を調整できるようにするため。
          */}
          {sprites.map((sprite) => (
            <div key={`debug-sprite-${sprite.key}`}>
              <div
                className="absolute border-2 border-cyan-300/80"
                style={{
                  left: sprite.left,
                  top: sprite.top,
                  width: sprite.width,
                  height: sprite.height,
                }}
              />
              <div
                className="absolute bg-cyan-300 rounded-full"
                style={{
                  left: sprite.left + sprite.width / 2,
                  top: sprite.top + sprite.height,
                  width: 8,
                  height: 8,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          ))}

          {/* groundLevel: true の置物（花など）はピンク枠で区別表示（常に主人公の背景） */}
          {groundSprites.map((sprite) => (
            <div
              key={`debug-ground-${sprite.key}`}
              className="absolute border-2 border-pink-400/80"
              style={{
                left: sprite.left,
                top: sprite.top,
                width: sprite.width,
                height: sprite.height,
              }}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
