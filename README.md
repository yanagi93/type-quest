# type-quest
A typing RPG built with Next.js and a Node.js/TypeScript backend
（設計の詳細は [`frontend/DESIGN.md`](frontend/DESIGN.md) / [`backend/DESIGN.md`](backend/DESIGN.md) 参照）。

## 開発環境の起動

フロントとバックエンドは別プロセスなので、それぞれ別ターミナルで起動する。

```bash
# バックエンド（http://localhost:4000）
cd backend
npm install
npm run dev

# フロントエンド（http://localhost:3000）
cd frontend
npm install
npm run dev
```

バックエンドの設定（JWT_SECRET等）は `backend/.env.example` を、フロントの
`NEXT_PUBLIC_API_BASE_URL` は `frontend/.env.example` を参考にコピーして使う
（どちらもデフォルトのままローカル開発は動く）。
