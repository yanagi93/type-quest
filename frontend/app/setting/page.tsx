"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotGothic16 } from "next/font/google";
import { HomeButton } from "@/components/HomeButton";
import { Card } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { api, type AuthUser } from "@/lib/api";

const dotFont = DotGothic16({ weight: "400", subsets: ["latin"] });

// frontend/DESIGN.md 2節でもともと予定していた「設定画面：自分のメールアドレス・
// ユーザー名を表示、未ログインならログイン画面へ誘導する」を、backend導入に合わせて実装
export default function SettingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await api.logout();
      router.push("/home");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`${dotFont.className} relative w-screen h-screen bg-slate-900 flex items-center justify-center`}>
      <HomeButton />

      <Card className="w-[420px] p-8 space-y-6 bg-white/90">
        <h1 className="text-3xl text-center">設定</h1>

        {loading && <p className="text-center text-sm">読み込み中…</p>}

        {!loading && user && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">ユーザー名</p>
              <p className="text-lg">{user.userName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">メールアドレス</p>
              <p className="text-lg">{user.email}</p>
            </div>

            <Button className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "ログアウト中…" : "ログアウト"}
            </Button>
          </div>
        )}

        {!loading && !user && (
          <div className="space-y-4 text-center">
            <p>ログインするとアカウント情報がここに表示されます。</p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              ログイン画面へ
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
