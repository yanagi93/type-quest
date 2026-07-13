import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../db";
import { issueTokenCookie, clearTokenCookie, requireAuth } from "../auth";

export const authRouter = Router();

type UserRow = {
  id: number;
  user_name: string;
  email: string;
  password_hash: string;
};

authRouter.post("/register", async (req, res) => {
  const { userName, email, password } = req.body ?? {};

  if (
    typeof userName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !userName.trim() ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({ error: "すべて入力してください" });
    return;
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: number }
    | undefined;

  if (existing) {
    res.status(409).json({ error: "このメールアドレスは既に登録されています" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare("INSERT INTO users (user_name, email, password_hash) VALUES (?, ?, ?)")
    .run(userName, email, passwordHash);

  const userId = Number(result.lastInsertRowid);

  issueTokenCookie(res, userId);
  res.status(201).json({ id: userId, userName, email });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "メールアドレスとパスワードを入力してください" });
    return;
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが違います" });
    return;
  }

  issueTokenCookie(res, user.id);
  res.json({ id: user.id, userName: user.user_name, email: user.email });
});

authRouter.post("/logout", (_req, res) => {
  clearTokenCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, user_name, email FROM users WHERE id = ?")
    .get(req.userId) as { id: number; user_name: string; email: string } | undefined;

  if (!user) {
    res.status(401).json({ error: "ログインが必要です" });
    return;
  }

  res.json({ id: user.id, userName: user.user_name, email: user.email });
});
