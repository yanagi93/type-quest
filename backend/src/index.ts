import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./db";
import { authRouter } from "./routes/auth";
import { progressRouter } from "./routes/progress";
import { scoresRouter } from "./routes/scores";

const PORT = Number(process.env.PORT ?? 4000);
// フロントのdevサーバー（Next.js）のオリジン。cookieを使うのでcredentials:trueとセットで
// 具体的なoriginを指定する必要がある（"*"は使えない）
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/progress", progressRouter);
app.use("/api/scores", scoresRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} (frontend origin: ${FRONTEND_ORIGIN})`);
});
