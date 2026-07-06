"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DotGothic16 } from "next/font/google";

import { Card } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/input";

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

  const handleRegister = () => {
    if (!userName || !email || !password || !confirmPassword) {
      alert("すべて入力してください");
      return;
    }

    if (password !== confirmPassword) {
      alert("パスワードが一致しません");
      return;
    }

    localStorage.setItem("userName", userName);
    localStorage.setItem("email", email);
    localStorage.setItem("password", password);

    alert("登録が完了しました！");
    router.push("/login");
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

          <Button className="w-full" onClick={handleRegister}>
            新規登録
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