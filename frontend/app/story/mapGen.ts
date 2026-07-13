import type { FloorTileType, GridMap, PlacedObject, TileType } from "./types";

// ============================================================
// 2〜8章のエリアマップを量産するための共通ヘルパー。
// chapter1Data.ts（村・フィールド）は既に動作確認済みなのでそのままにしてあるが、
// 同じような「床を敷く」「置物をばら撒く」処理を新しい章のたびに書き直さずに済むよう、
// 汎用部分だけをここに切り出してある。
// ============================================================

export function makeGrid<T>(width: number, height: number, value: T): T[][] {
  return Array.from({ length: height }, () => Array<T>(width).fill(value));
}

// 同じ画像・同じ大きさの置物を、座標のリストだけで量産するヘルパー
// （chapter1Data.tsのscatterObjectsと同じ考え方）
export function scatterObjects(
  idPrefix: string,
  image: string,
  size: {
    widthTiles: number;
    heightTiles: number;
    groundLevel?: boolean;
    blocksMovement?: boolean;
    collisionWidthTiles?: number;
    collisionHeightTiles?: number;
  },
  positions: [number, number][]
): PlacedObject[] {
  return positions.map(([x, y], index) => ({
    id: `${idPrefix}-${index}`,
    image,
    x,
    y,
    widthTiles: size.widthTiles,
    heightTiles: size.heightTiles,
    groundLevel: size.groundLevel,
    blocksMovement: size.blocksMovement,
    collisionWidthTiles: size.collisionWidthTiles,
    collisionHeightTiles: size.collisionHeightTiles,
  }));
}

// 切り出したタイル素材（1テーマにつき複数バリエーションある画像）を、
// 単調にならないよう順番に割り当てながらばら撒くヘルパー
export function scatterVariedTexture(
  idPrefix: string,
  dir: string,
  textureBaseName: string,
  variantCount: number,
  positions: [number, number][],
  options?: { blocksMovement?: boolean; groundLevel?: boolean }
): PlacedObject[] {
  return positions.map(([x, y], index) => ({
    id: `${idPrefix}-${index}`,
    image: `${dir}/${textureBaseName}_${(index % variantCount) + 1}.png`,
    x,
    y,
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: options?.blocksMovement,
    groundLevel: options?.groundLevel,
  }));
}

// 床の見た目のASCII表を実際のFloorTileType[][]に変換する（文字数・行数が合わない場合は
// 起動時にエラーで教えてくれる。chapter1Data.tsのparseFloorRowsと同じ考え方）
export function parseFloorRows(
  rows: string[],
  expectedHeight: number,
  expectedWidth: number,
  label: string,
  charMap: Record<string, FloorTileType>
): FloorTileType[][] {
  if (rows.length !== expectedHeight) {
    throw new Error(`${label}は${expectedHeight}行である必要があります（実際: ${rows.length}行）`);
  }

  return rows.map((row, y) => {
    if (row.length !== expectedWidth) {
      throw new Error(`${label}の${y}行目は${expectedWidth}文字である必要があります（実際: ${row.length}文字）`);
    }

    return row.split("").map((char, x) => {
      const tile = charMap[char];

      if (!tile) {
        throw new Error(`${label}の(${x}, ${y})に不明な文字「${char}」があります`);
      }

      return tile;
    });
  });
}

// マップエディタ（MapEditor.tsx）の書き出し文字と揃えてある既定の対応表
export const AREA_FLOOR_CHAR_MAP: Record<string, FloorTileType> = {
  ".": "grass",
  "#": "dirt",
  "~": "water",
  "s": "sand",
  "o": "stone",
};

// マップエディタが書き出す当たり判定のASCII（. 床 / # 壁）をGridMap.tilesに変換する。
// 貼り付けた行の文字数・行数がズレていたら起動時にエラーで教えてくれる
export function parseWallRows(rows: string[], expectedHeight: number, expectedWidth: number, label: string): TileType[][] {
  if (rows.length !== expectedHeight) {
    throw new Error(`${label}は${expectedHeight}行である必要があります（実際: ${rows.length}行）`);
  }

  return rows.map((row, y) => {
    if (row.length !== expectedWidth) {
      throw new Error(`${label}の${y}行目は${expectedWidth}文字である必要があります（実際: ${row.length}文字）`);
    }

    return row.split("").map((char, x) => {
      if (char === "#") return "wall";
      if (char === ".") return "floor";
      throw new Error(`${label}の(${x}, ${y})に不明な文字「${char}」があります。使えるのは "." と "#" のみです`);
    });
  });
}

export type Rect = { x0: number; y0: number; x1: number; y1: number }; // 両端を含む

// 床の見た目グリッドの矩形範囲を、指定した床タイプで塗りつぶす
export function fillRegion(grid: FloorTileType[][], region: Rect, floor: FloorTileType) {
  for (let y = region.y0; y <= region.y1; y++) {
    for (let x = region.x0; x <= region.x1; x++) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = floor;
    }
  }
}

// 村・フィールドと同じ「全部床、外周だけ壁」の当たり判定グリッド。
// 町や野外のような、置物の位置だけを壁にする（大部分が歩ける）マップ向け
export function makeOpenAreaTiles(width: number, height: number): TileType[][] {
  const tiles = makeGrid<TileType>(width, height, "floor");

  for (let x = 0; x < width; x++) {
    tiles[0][x] = "wall";
    tiles[height - 1][x] = "wall";
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0] = "wall";
    tiles[y][width - 1] = "wall";
  }

  return tiles;
}

// 全部壁で埋めた当たり判定グリッド。ダンジョン系（部屋＋通路を彫っていくマップ）向け
export function makeAllWallTiles(width: number, height: number): TileType[][] {
  return makeGrid<TileType>(width, height, "wall");
}

// 矩形の部屋を彫る（範囲内を床にする）
export function carveRoom(tiles: TileType[][], room: Rect) {
  for (let y = room.y0; y <= room.y1; y++) {
    for (let x = room.x0; x <= room.x1; x++) {
      if (tiles[y]?.[x] !== undefined) tiles[y][x] = "floor";
    }
  }
}

// 2点間を幅1マスのL字（横→縦）の通路で彫ってつなぐ。部屋同士を確実につなげるために使う
export function carveCorridor(tiles: TileType[][], from: [number, number], to: [number, number]) {
  const [x0, y0] = from;
  const [x1, y1] = to;

  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  for (let x = minX; x <= maxX; x++) {
    if (tiles[y0]?.[x] !== undefined) tiles[y0][x] = "floor";
  }

  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let y = minY; y <= maxY; y++) {
    if (tiles[y]?.[x1] !== undefined) tiles[y][x1] = "floor";
  }
}

// blocksMovement: true の置物（1x1マス限定。フィールドと同じ簡易版）の位置を壁にする
export function blockObjectTiles(tiles: TileType[][], objects: PlacedObject[]) {
  for (const object of objects) {
    if (!object.blocksMovement) continue;
    if (tiles[object.y]?.[object.x] !== undefined) tiles[object.y][object.x] = "wall";
  }
}

// 置物の見た目の範囲（矩形）を計算する。x, yは足元のマスなので、下端中央がそのマスの
// 下端中央に来るように逆算する（chapter1Data.tsのfootprintOfと同じ式。GridExplorer.tsxの
// 描画ロジックと揃えてある）
export function footprintOf(x: number, y: number, widthTiles: number, heightTiles: number): Rect {
  const left = Math.round(x + 0.5 - widthTiles / 2);
  const top = Math.round(y + 1 - heightTiles);
  return { x0: left, y0: top, x1: left + widthTiles - 1, y1: top + heightTiles - 1 };
}

// blocksMovement: true の置物を、大きさ（widthTiles/heightTiles、collisionWidthTiles/
// collisionHeightTilesがあればそちら優先）に応じた矩形まるごと壁にする。
// 家のような大きい置物（6x6など）を町に置くときはこちらを使う
export function blockObjectFootprints(tiles: TileType[][], objects: PlacedObject[]) {
  for (const object of objects) {
    if (!object.blocksMovement) continue;

    const w = object.collisionWidthTiles ?? object.widthTiles;
    const h = object.collisionHeightTiles ?? object.heightTiles;
    const fp = footprintOf(object.x, object.y, w, h);

    for (let y = fp.y0; y <= fp.y1; y++) {
      for (let x = fp.x0; x <= fp.x1; x++) {
        if (tiles[y]?.[x] !== undefined) tiles[y][x] = "wall";
      }
    }
  }
}

// GridMap一式（tiles / floorTextures / start）を組み立てる小さなショートカット
export function buildAreaMap(tiles: TileType[][], start: { x: number; y: number }): GridMap {
  return { tiles, start };
}
