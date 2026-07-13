# タイプクエスト バックエンド 設計ドキュメント

`frontend/DESIGN.md` 3節に書いてあった「ローカルのみの見せかけ認証」を本物に置き換え、
セーブデータ・ランキングも永続化する。着手前にここへAPI設計・DB設計をまとめておく、
という`frontend/DESIGN.md`側の運用ルールに従って書いたもの。

## 1. 技術スタック

- Node.js（v22） + TypeScript + Express
- DB：SQLite（`better-sqlite3`）。ファイル1つで動き、Docker等のセットアップが要らないため、
  個人開発の現段階に合っている。将来スケールさせる必要が出たらPostgres等に移行すればよい
  （テーブル設計はSQL標準に寄せてあるので移行しやすい）。
- 認証：JWT（`jsonwebtoken`）をhttpOnly cookieに入れて発行。パスワードは`bcrypt`でハッシュ化。
- フロントとは別プロセス・別ポート（デフォルト`4000`）で動かす。フロント側からは
  `NEXT_PUBLIC_API_BASE_URL`（デフォルト`http://localhost:4000`）を見てfetchする
  （`frontend/lib/api.ts`）。cookieを使うのでCORSは`credentials: true`必須、
  フロントのfetchも`credentials: "include"`を必ず付ける。

## 2. DBスキーマ

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 章ごとのストーリー進行状況。今は第1章しか無いので chapter_id=1 固定運用だが、
-- 将来の章に備えて chapter_id を主キーの一部にしてある
CREATE TABLE story_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, chapter_id)
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,      -- "practice" | "story"
  level TEXT,              -- practice: "easy"|"normal"|"hard"。storyはNULL
  score INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_scores_leaderboard ON scores (mode, level, score DESC);
```

`state_json`は`frontend/app/story/useStoryState.ts`の`Chapter1State`をそのままJSON文字列で
保存する（フロント側の型が正、バックエンドはスキーマを知らずそのまま出し入れするだけの
「入れ物」に徹する。フィールドが増減してもバックエンド側の変更は不要）。

## 3. API一覧

すべて`/api`配下。認証が要るエンドポイントは`requireAuth`ミドルウェアでcookieのJWTを検証する。

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| POST | `/api/auth/register` | 不要 | `{userName, email, password}` → ユーザー作成、cookie発行 |
| POST | `/api/auth/login` | 不要 | `{email, password}` → 検証、cookie発行 |
| POST | `/api/auth/logout` | 不要 | cookie削除 |
| GET | `/api/auth/me` | 要 | `{id, userName, email}`。未ログインは401 |
| GET | `/api/progress?chapterId=1` | 要 | 保存済み`Chapter1State`（無ければ404） |
| PUT | `/api/progress` | 要 | `{chapterId, state}` → upsert |
| POST | `/api/scores` | 要 | `{mode, level, score, floor}` → 記録 |
| GET | `/api/scores/leaderboard?mode=&level=&limit=20` | 不要 | 上位スコア一覧（userNameを含む） |

エラーは`{error: string}`のJSONで返し、HTTPステータスで種別を表す
（400=バリデーション、401=未認証、404=無し、409=email重複、500=サーバ側）。

## 4. 認証方式の詳細

- 登録：`email`重複チェック→`bcrypt.hash(password, 10)`→INSERT→JWT発行→
  `Set-Cookie: token=...; HttpOnly; SameSite=Lax; Path=/`。
- ログイン：emailでSELECT→`bcrypt.compare`→JWT発行。
- JWTのペイロードは`{userId}`のみ（最小限）。有効期限7日、`JWT_SECRET`環境変数で署名
  （`.env`未設定時は開発用の固定文字列にフォールバックし、起動時に警告ログを出す）。
- `requireAuth`ミドルウェア：cookieからJWTを検証し、`req.userId`にセットする
  （検証失敗・cookie無しは401）。

以前のフロント単体の「平文比較・1アカウントのみ」実装（`localStorage`に`email`/`password`を
そのまま保存）は完全に置き換える。旧`localStorage`の`email`/`password`/`userName`/
`isLoggedIn`キーはもう使わない（フロント側でも読み書きをやめる）。

## 5. フロント側の統合方針

- `frontend/lib/api.ts`：バックエンドへのfetchをまとめた薄いクライアント
  （ベースURL・`credentials:"include"`・エラー時のJSONパースを共通化）。
- `app/register/page.tsx` / `app/login/page.tsx`：localStorageへの直書きをやめ、
  `POST /api/auth/register` / `/api/auth/login`を呼ぶように変更。
- `app/home/page.tsx`：`isLoggedIn`のlocalStorage読み取りをやめ、
  マウント時に`GET /api/auth/me`を呼んでログイン状態を判定する。
- `app/setting/page.tsx`：スタブを実装に置き換え、`GET /api/auth/me`の内容
  （ユーザー名・メールアドレス）を表示し、ログアウトボタンを置く
  （`frontend/DESIGN.md` 2節に元々あった「自分のメールアドレス・ユーザー名を表示する予定」
  という計画をここで実現する）。
- `app/story/useStoryState.ts`：ログイン中は`storyProgress`のセーブ先をバックエンドに
  切り替える。未ログイン（ゲストプレイ）時は今まで通りlocalStorageのみで動く
  （オフラインでも遊べることを優先し、ログインは必須にしない）。具体的には：
  - マウント時：ログイン中なら`GET /api/progress`を試し、成功すればそれを初期状態にする
    （無ければlocalStorageの内容をそのまま初回保存として使う＝ゲスト時代のセーブを引き継げる）。
    失敗・未ログインならlocalStorageから読む（従来通り）。
  - 更新時：常にlocalStorageへも書く（オフライン耐性・体感速度のため即時反映）うえで、
    ログイン中なら`PUT /api/progress`もfire-and-forgetで呼ぶ（失敗してもゲーム進行は
    止めない。次の更新時にまた送られるので、単発の通信失敗は自然にリカバリされる）。
- `app/ranking/page.tsx`：スタブを実装に置き換え、`GET /api/scores/leaderboard`を
  呼んで上位者一覧を表示する。
- `app/battle/page.tsx`：ゲームオーバー時・ストーリー勝利時に、ログイン中であれば
  `POST /api/scores`でその回のスコアを送る（未ログインなら送らない＝ゲストのスコアは
  ランキング対象外。ランキングに載せたければログインする、という動機づけにもなる）。

## 6. 今後の課題（今回のスコープ外）

- メール確認・パスワードリセットなどのフローは無し（個人開発の初期段階として省略）。
- レートリミット・CSRF対策は最小限（同一オリジン運用前提。将来公開する場合は要検討）。
- `story_progress`は第1章のみ運用（`chapter_id`はテーブル設計上は複数章に対応済み）。
