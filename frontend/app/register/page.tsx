"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DotGothic16 } from "next/font/google";

import { Card } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

const dotFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
});

export default function RegisterPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // alert()はブラウザのネイティブモーダルで操作がブロックされてしまう（自動テストが
  // 固まる原因にもなった）ので、フォーム内にメッセージを表示する方式にしてある
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!userName || !email || !password || !confirmPassword) {
      setMessage("すべて入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("パスワードが一致しません");
      return;
    }

    setMessage(null);
    setIsSubmitting(true);

    try {
      // backend/（Express、backend/DESIGN.md参照）に本物のアカウントを作成する。
      // 登録に成功するとcookie（httpOnly JWT）が発行され、その場でログイン状態になる
      await api.register(userName, email, password);
      router.push("/home");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-screen h-screen">
      <Image
        src="/images/back-ground/title.png"
        alt="背景"
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="w-[450px] p-8 space-y-2 bg-white/90">
          <h1 className={`${dotFont.className} text-4xl text-center`}>
            REGISTER
          </h1>

          <div className="space-y-1">
            <p className={dotFont.className}>ユーザー名</p>
            <Input
              type="text"
              placeholder="ユーザー名"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <p className={dotFont.className}>メールアドレス</p>
            <Input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <p className={dotFont.className}>パスワード</p>
            <Input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <p className={dotFont.className}>パスワード（確認）</p>
            <Input
              type="password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {message && <p className="text-sm text-red-600 text-center">{message}</p>}

          <Button className="w-full" onClick={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? "登録中…" : "新規登録"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            ログイン画面へ
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/")}
          >
            ホームへ戻る
          </Button>
        </Card>
      </div>
    </div>
  );
}