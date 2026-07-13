import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";

export const scoresRouter = Router();

const VALID_MODES = new Set(["practice", "story"]);

scoresRouter.post("/", requireAuth, (req, res) => {
  const { mode, level, score, floor } = req.body ?? {};

  if (
    typeof mode !== "string" ||
    !VALID_MODES.has(mode) ||
    typeof score !== "number" ||
    typeof floor !== "number" ||
    (level !== null && level !== undefined && typeof level !== "string")
  ) {
    res.status(400).json({ error: "mode/score/floorが不正です" });
    return;
  }

  db.prepare(
    "INSERT INTO scores (user_id, mode, level, score, floor) VALUES (?, ?, ?, ?, ?)"
  ).run(req.userId, mode, level ?? null, score, floor);

  res.status(201).end();
});

// ログインしていなくても他人のランキングは見られる（不要）
scoresRouter.get("/leaderboard", (req, res) => {
  const mode = typeof req.query.mode === "string" ? req.query.mode : undefined;
  const level = typeof req.query.level === "string" ? req.query.level : undefined;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (mode && VALID_MODES.has(mode)) {
    conditions.push("scores.mode = ?");
    params.push(mode);
  }
  if (level) {
    conditions.push("scores.level = ?");
    params.push(level);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT scores.score, scores.floor, scores.mode, scores.level, scores.created_at,
              users.user_name AS userName
       FROM scores
       JOIN users ON users.id = scores.user_id
       ${where}
       ORDER BY scores.score DESC
       LIMIT ?`
    )
    .all(...params, limit);

  res.json({ entries: rows });
});
