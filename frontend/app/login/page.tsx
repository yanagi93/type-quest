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

export default function LoginPage() {
    
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const savedEmail = localStorage.getItem("email");
  const savedPassword = localStorage.getItem("password");

  const handleLogin = () => {
    if (email === savedEmail && password === savedPassword) {
        localStorage.setItem("isLoggedIn", "true");
        router.push("/home");
    } else {
        alert("メールアドレスまたはパスワードが違います");
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
        <Card className="w-[450px] p-8 space-y-6 bg-white/90">
          <h1
            className={`${dotFont.className} text-4xl text-center`}
          >
            LOGIN
          </h1>

          <div className="space-y-2">
            <p className={dotFont.className}>メールアドレス</p>

            <Input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className={dotFont.className}>パスワード</p>

            <Input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
          >
            ログイン
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/register")}
          >
            新規登録はこちら
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