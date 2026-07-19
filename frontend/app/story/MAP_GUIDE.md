# マップの作り方ガイド

このゲームのマップ（村・フィールドなど）がどういうデータでできているか、
新しいマップ（2章以降）を自分で作るときの手順をまとめたもの。
実装済みの参考例は `chapter1Data.ts` の `TOWN_MAP` / `FIELD_MAP`。

## 1. マップは3つのデータでできている

1体のマップは、次の3種類のデータを組み合わせて作る。

### ① `tiles`（当たり判定：歩けるか歩けないか）
`"floor"` か `"wall"` だけが入った2次元配列（`GridMap["tiles"]`）。ゲームの動きを決める本体。

### ② 床の見た目（`FloorTileType[][]`）
`tiles` とは完全に別レイヤー。草・土の道・水面・砂地・岩地・森・川・湖・池・泥地・
床飾り（きらめき・斑点タイルなど）のどれを敷くかだけを決める、見た目専用のデータ。
**歩けるかどうかには一切関係しない**（水面の上を歩かせることも可能）。
`FloorTileType` の一覧は `types.ts` を参照（増やしたい床の種類があれば、ここに追加してから
`GridExplorer.tsx` の `FLOOR_TILE_IMAGES`／`RANDOM_VARIANT_IMAGES` に画像パスを足し、
`mapGen.ts` の `AREA_FLOOR_CHAR_MAP` にも書き出し用の文字を足す。
`MapEditor.tsx` の床の筆にも同じ手順で追加できる）。

### ③ その上に乗せる「物」
- **`Interactable`**（`TOWN_INTERACTABLES`のようなもの）: 家・井戸・ボス・出口など、
  会話やイベントを持つ物。`kind: "npc" | "object" | "boss" | "exit"`。
- **`PlacedObject`**（`TOWN_OBJECTS`のようなもの）: 会話を持たない、見た目だけの飾り
  （木・花・柵・石）。`blocksMovement: true` にすると当たり判定にもなる。
- **`WandererDefinition`**（`TOWN_WANDERERS`のようなもの）: 決まった位置に留まらず、
  `spawnX/Y` を中心に歩き回るNPC（村人・猫・犬）。

それぞれのフィールドの意味は `types.ts` のコメントに書いてある。

## 2. マップの広さの変え方

`chapter1Data.ts` の例では `TOWN_GRID_WIDTH` / `TOWN_GRID_HEIGHT`
（フィールドなら `FIELD_GRID_WIDTH` / `FIELD_GRID_HEIGHT`）という定数がマスの数を決めている。

- **手書きのASCIIマップ**（`TOWN_FLOOR_ROWS` のように文字列の配列で床を書いている場合）は、
  幅・高さを変えるとその文字数・行数も必ず合わせないといけない（合わないと起動時にエラーで教えてくれる）。
  行を1本ずつ手で足し引きするのは面倒なので、**下記のマップエディタでリサイズしてから
  書き出す**のが一番早い。
- **コードで自動生成しているマップ**（`FIELD_FLOOR_ROWS` のように関数で床を決めている場合）は、
  定数を変えるだけで自動的に合う。

## 3. マップエディタ（`/story/map-editor`）

ブラウザで `http://localhost:3000/story/map-editor` を開くと使える、開発用の下書きツール
（`MapEditor.tsx`）。実際のゲーム画面ではなく、**マス目を塗って、貼り付け用のテキストとして
書き出すためだけ**のもの。

使い方:
1. 上部の「幅」「高さ」を入力して「サイズ変更」（既に塗った部分は左上基準でそのまま残る）
2. モードを「床・壁を塗る」にして、「床の筆」で床の種類を選んでマス目をクリック
   （ドラッグでまとめて塗れる）
3. 同じく「床・壁を塗る」モードのまま、「壁の筆」で「壁にする」を選び、通れなくしたい
   場所を塗る（部屋の壁・洞窟の岩肌など）
4. モードを「置物を置く」に切り替えると、木・家・岩・花・井戸・宝箱をはじめ、
   `public/images/map/okimono/` 以下にある画像がほぼすべて選べるパレットが出る。
   置きたい種類を選んでマス目をクリックすると1個ずつ設置され、既に置いてある置物を
   クリックすると削除される（ドラッグでの連続設置はしない。置きすぎ防止のため）
5. モードを「💬 会話ポイントの印を置く」に切り替えると、マス目をクリックするだけで
   💬マークが置ける（もう一度クリックで削除）。これはNPC・出口・ボスなど「あとで会話や
   イベントを作る予定の場所」に印を付けておくためのもので、実際の会話内容はまだ作らない。
   印を置くと下にメモ欄が出るので、「村人・ひのことば」のように短いメモを書いておける
   （空のままでもよい）
6. 「ズーム」のスライダーか「全体表示にズーム」ボタンで、マップ全体を縮小して見渡せる
   （既存の村・フィールドマップを見たいときは「村マップ」「フィールドマップ」ボタンで読み込める。
   読み込み時は床・壁だけで、置物・会話ポイントは空の状態になる）
7. 「テキストとして書き出す」を押すと、`XXX_FLOOR_ROWS` / `XXX_WALL_ROWS` という
   2つのASCII配列、`XXX_OBJECTS` という `PlacedObject[]` 配列、そして
   `XXX_INTERACTABLES_TODO` という `Interactable[]` の雛形（会話ポイントのメモを
   `dialogue`に入れただけの下書き。`kind`はとりあえず`"npc"`にしてあるので、
   出口やボスにしたい場合はあとで書き換える）がテキストエリアに出てくるので、
   コピーして次の手順で使う

置物パレットに無い画像を使いたい場合は、書き出したあとに手でコードとして足す（後述）。

## 4. 実際に新しいマップを追加する手順

**方針**：マップ同士のつながり（`kind: "exit"` で別のマップへ切り替える出口や、
`StoryGame.tsx` 側のシーン配線）は今は作らず、**マップ単体を仕上げることだけに集中する**。
つながりはあとでまとめて作る（フェーズ2）。

### フェーズ1：マップ単体を作る（今やること）

例として2章の町マップを作る場合:

1. **マップエディタで下書き**して、床と壁のASCII配列を書き出す
2. `chapter1Data.ts` を参考に新しいファイル（例: `chapter2Data.ts`）を作り、
   書き出したASCIIを `CHAPTER2_FLOOR_ROWS` のような定数として貼る
3. 壁のASCII（`XXX_WALL_ROWS`）は `GridMap["tiles"]` に変換する。一番簡単なのは、
   `parseFloorRows` と同じような小さい変換関数を書いて `'#'` → `"wall"` / `'.'` → `"floor"`
   にすること（`buildTownTiles()` のような「物の位置から自動計算」方式に乗り換えたい場合は、
   後述の「自動計算方式」を参照）
4. 家・NPC・ボスなどを `Interactable[]` として追加する（**出口＝`kind: "exit"` はまだ
   追加しない**）。それぞれ最低限 `id, x, y, kind, label, dialogue` が必要
   （画像を出したいなら `image` と `widthTiles/heightTiles` も）
5. 木や花などの飾りを `PlacedObject[]` として追加する（`scatterObjects` ヘルパーを使うと
   同じ画像を大量に置く作業が楽になる）
6. 歩き回るNPCが欲しければ `WandererDefinition[]` を追加する
7. `TOWN_MAP` と同じ形で `GridMap` としてまとめてexportする
   （`{ tiles: ..., start: { x, y } }`）
8. ゲーム中に **`g` キー**を押すと当たり判定のデバッグ表示（壁=赤、床=緑の枠、置物の
   footprint=水色の枠）が出るので、実際の見た目と当たり判定がズレていないか確認する
   （この時点ではまだどのシーンからも辿り着けないマップなので、確認は`GridExplorer`単体を
   一時的に差し替えるか、フェーズ2の配線を先に軽く済ませてから行う）

この段階では `StoryGame.tsx` の配線（シーン切り替え）は一切いじらない。
複数の章のマップが一通り揃ってから、フェーズ2でまとめてつなげる。

### フェーズ2：マップ同士をつなげる（あとでまとめてやること）

1. つなぎたい2つのマップに、それぞれ `kind: "exit"` の `Interactable` を追加する
   （行き先のマップ名を `exitsTo` に指定する。今は `"field" | "town"` の2値だが、
   章が増える分だけ増やす必要がある）
2. `StoryGame.tsx` にシーン切り替えの配線を足す（`isTown` 相当の分岐を増やし、
   `GridExplorer` への `map` / `interactables` / `objects` の出し分けを追加する）
3. `chapter1Data.ts` の `FIELD_LANDMARKS` にある「まだ入れない」プレースホルダーの目印を、
   実際に入れる章の入り口（`kind: "exit"`）に差し替える
4. 到達可能性の確認（すべての家・出口・ボスに実際に歩いて行けるか）は、Node.jsのBFS
   スクリプトで機械的にチェックできる（これまでの章でも使ってきた方法。必要なら作る）
5. 出口から出口へ実際に歩いて行き来できるかブラウザで確認する

## 5. 当たり判定の作り方：手書き vs 自動計算

村（`TOWN_MAP`）は「物の位置から壁を自動計算する」方式（`buildTownTiles()`）を採用している。
家や木の `x, y` を変えれば当たり判定も自動でついてくるので、
「見た目と当たり判定がズレる」事故が起きにくい。新しく作るマップも、物の数が多い
（村のような）ものはこの方式をおすすめする。

一方、マップエディタで壁を直接塗って `XXX_WALL_ROWS` をそのまま使う方式は、
物の少ないシンプルな地形（洞窟の通路、フィールドの地形）や、
「この形に壁を通したい」という意図がはっきりしている場合に向いている。

どちらを選んでもよいが、1つのマップの中で混在させる場合は、
自動計算のほうを後から適用して手書きの壁を上書きしてしまわないよう順番に注意すること。

## 6. 参考例：2〜8章のエリアマップ下書き（`chapter2Data.ts`〜`chapter8Data.ts`）

WORLD_DESIGN.mdの各章のエリアマップ構成に沿って、床・壁・置物だけを先に用意した
下書きマップを10枚（`chapter2Data.ts`〜`chapter8Data.ts`）に置いてある。
出口やNPCの会話はまだ無い（フェーズ1のまま）。すべて`mapGen.ts`（後述）の
ヘルパー関数だけで組み立ててあるので、コードから作る場合の参考にしてほしい。
全マップともNode.jsのBFSスクリプトで「床マスが全部つながっているか」を確認済み。

- `chapter2Data.ts`: `DESERT_TOWN_MAP`（砂漠の町）/ `DESERT_DUNES_MAP`（砂漠）/ `PYRAMID_MAP`（ピラミッド）
- `chapter3Data.ts`: `FAIRY_VILLAGE_MAP`（妖精の里）/ `MAZE_FOREST_MAP`（迷いの森）
- `chapter4Data.ts`: `CAVE_MAP`（謎の洞窟）
- `chapter5Data.ts`: `RUINED_TOWN_MAP`（荒れ果てた町）
- `chapter6Data.ts`: `SWAMP_MAP`（毒の沼地）
- `chapter7Data.ts`: `SILENT_TOWER_MAP`（沈黙の塔 1F）
- `chapter8Data.ts`: `DEMON_CASTLE_MAP`（魔王城）

### `mapGen.ts` のヘルパー関数

`chapter1Data.ts`にあった「床を塗る」「置物をばら撒く」処理の汎用部分を切り出したもの。
新しいマップをコードで組み立てるときに使える。

- `makeOpenAreaTiles(width, height)`: 村・フィールドと同じ「全部床、外周だけ壁」のグリッド。
  町や野外のような、置物の位置だけを壁にするマップ向け
- `makeAllWallTiles(width, height)`: 全部壁のグリッド。`carveRoom` / `carveCorridor` で
  部屋と通路を彫っていくダンジョン向け（`PYRAMID_MAP` / `CAVE_MAP` / `SILENT_TOWER_MAP` /
  `DEMON_CASTLE_MAP` で使用）
- `carveRoom(tiles, {x0,y0,x1,y1})`: 矩形の部屋を彫る（範囲内を床にする）
- `carveCorridor(tiles, [x0,y0], [x1,y1])`: 2点間をL字の通路でつなぐ
- `fillRegion(floorGrid, rect, floorType)`: 床の見た目グリッドの矩形範囲を塗る
- `scatterObjects` / `scatterVariedTexture`: chapter1Data.tsと同じ、置物を量産するヘルパー
- `blockObjectFootprints(tiles, objects)`: `blocksMovement: true` の置物を、大きさに応じた
  矩形まるごと壁にする（`makeOpenAreaTiles`系のマップで使う）
- `buildAreaMap(tiles, start)`: `{ tiles, start }` の`GridMap`を組み立てる
