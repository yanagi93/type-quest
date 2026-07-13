import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/", (req, res) => {
  const chapterId = Number(req.query.chapterId ?? 1);

  const row = db
    .prepare("SELECT state_json FROM story_progress WHERE user_id = ? AND chapter_id = ?")
    .get(req.userId, chapterId) as { state_json: string } | undefined;

  if (!row) {
    res.status(404).json({ error: "セーブデータがありません" });
    return;
  }

  // state_jsonの中身（Chapter1Stateの形）はフロント側が正なので、ここでは
  // パースせずそのまま返すだけにしてある（backend/DESIGN.md 2節参照）
  res.json({ chapterId, state: JSON.parse(row.state_json) });
});

progressRouter.put("/", (req, res) => {
  const { chapterId, state } = req.body ?? {};

  if (typeof chapterId !== "number" || typeof state !== "object" || state === null) {
    res.status(400).json({ error: "chapterIdとstateが必要です" });
    return;
  }

  db.prepare(
    `INSERT INTO story_progress (user_id, chapter_id, state_json, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT (user_id, chapter_id)
     DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`
  ).run(req.userId, chapterId, JSON.stringify(state));

  res.status(204).end();
});
