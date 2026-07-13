import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// .envにJWT_SECRETが無い場合は開発用の固定値にフォールバックする（起動時に警告する。
// backend/DESIGN.md 4節参照）。本番運用するなら必ず.envで上書きすること
export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET が未設定なので開発用の固定値を使っています。本番運用する前に.envで設定してください。"
  );
}

const COOKIE_NAME = "token";
const TOKEN_TTL = "7d";

export function issueTokenCookie(res: Response, userId: number) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// cookieのJWTを検証し、通ればreq.userIdをセットする。無ければ401
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: "ログインが必要です" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "ログインが必要です" });
  }
}
