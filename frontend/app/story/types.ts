// マス目は歩けるか(floor)歩けないか(wall)だけを持つ。
// 井戸・焚き火・出口・ボスなどは別のInteractable配列としてマスに重ねる。
export type TileType = "floor" | "wall";

export type GridMap = {
  tiles: TileType[][]; // tiles[y][x]
  start: { x: number; y: number };
};

export type Interactable = {
  id: string;
  x: number;
  y: number;
  kind: "npc" | "object" | "exit" | "boss";
  // プレースホルダー表示用の絵文字・短いラベル（専用スプライトが無いため）
  label: string;
  teachesWord?: { kana: string; kanji: string };
  dialogue?: string[];
  exitsTo?: "field" | "town";
};
