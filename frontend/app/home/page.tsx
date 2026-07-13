"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button  } from "@/components/ui/8bit/button"
import { Card  } from "@/components/ui/8bit/card"
import { useRouter } from "next/navigation";
import { DotGothic16 } from "next/font/google";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/8bit/dialog";
import { api } from "@/lib/api";

const dotFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
});

const cards = [
  {
    id: "story",
    row: 0,
    col: 0,
    title: "旅に出る",
    path: "/story",
    image: "/images/story.png",
    locked: true,
  },
  {
    id: "battle",
    row: 0,
    col: 1,
    title: "闘技場",
    path: "/battle",
    image: "/images/battle.png",
    locked: true,
  },
  {
    id: "practice",
    row: 1,
    col: 1,
    title: "試練の塔",
    path: "/practice",
    image: "/images/practice.png",
    locked: false,
  }
];

export default function Home() {
  // セレクト機能
  const router = useRouter();

  const [selected, setSelected] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  // ログイン状態はbackend/（Express）のcookie（httpOnly JWT）で判定する。
  // localStorageの"isLoggedIn"フラグはもう使わない（backend/DESIGN.md 5節参照）
  useEffect(() => {
    api
      .me()
      .then(() => setIsLoggedIn(true))
      .catch(() => setIsLoggedIn(false));
  }, []);

  // キーボード押された時の機能
  useEffect(() => {
    if (open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.key === "ArrowRight") {
        if (selected === 0) setSelected(1);
      }

      if (event.key === "ArrowLeft") {
        if (selected === 1 || selected === 2) setSelected(0);
      }

      if (event.key === "ArrowDown") {
        if (selected === 1) setSelected(2);
      }

      if (event.key === "ArrowUp") {
        if (selected === 2) setSelected(1);
      }

      if (event.key === "Enter") {
        event.preventDefault();

        const card = cards[selected];

        if (card.locked && !isLoggedIn) {
          setOpen(true);
          return;
        }

        router.push(card.path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected, router, open, isLoggedIn]);

  return (
    <div>
      <div className="relative w-screen h-screen">

        {/* 背景 */}
        <Image
          src = "/images/back-ground/title.png"
          alt = "type quest タイトル背景"
          fill
          className="object-cover object-bottom"
          priority
        />
        {/* 設定画面へ（自分のアカウント情報表示・ログアウト）。誰でも押せるが、
            中身（/setting側）は未ログインならログイン画面へ誘導する
            （frontend/DESIGN.md 2節でもともと予定していた導線） */}
        <button
          onClick={() => router.push("/setting")}
          className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-black/60 border-2 border-white/40 flex items-center justify-center text-white hover:bg-black/80 transition"
          aria-label="設定"
        >
          <Settings />
        </button>

        <div className="absolute inset-0 flex flex-col justify-start pt-12 items-center gap-10 ">

          <Card className="text-xl px-8 py-4 transition">
            ゲームモード選択
          </Card>


          <div className="grid grid-cols-[2fr_1fr] gap-10 w-[90vw] h-[70vh]">

            {/* 左（ストーリー） */}
            <Card
                onClick={() => {
                  if (cards[0].locked && !isLoggedIn) {
                    setOpen(true)
                    return;
                  }
                  router.push("/story")}}
                onMouseEnter={() => setSelected(0)}
                className={`${dotFont.className} relative h-full transition ${
                selected === 0 ? "scale-102 ring-4 ring-yellow-400" : ""
                }`}
            >
                <Image
                fill
                src="/images/back-ground/story-select1.png"
                alt="ストーリーモード"
                className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-6 left-6">
                    <h2
                        className={`${dotFont.className} text-5xl text-white drop-shadow-xl`}
                    >
                        旅に出る
                    </h2>
                    <h5
                        className={`${dotFont.className} text-2xl text-white drop-shadow-xl`}
                    >
                        ストーリーモード
                    </h5>
                </div>
            </Card>

            {/* 右側 */}
            <div className="flex flex-col gap-10 h-full">

                <Card
                onClick={() => {
                  if (cards[1].locked && !isLoggedIn) {
                    setOpen(true)
                    return;
                  }
                  router.push("/battle");
                }}
                onMouseEnter={() => setSelected(1)}
                className={`${dotFont.className} relative flex-1 transition ${
                    selected === 1 ? "scale-102 ring-4 ring-yellow-400" : ""
                }`}
                >
                    <Image
                        fill
                        src="/images/back-ground/online-select1.png"
                        alt="闘技場"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute bottom-6 left-6">
                        <h2
                            className={`${dotFont.className} text-5xl text-white drop-shadow-xl`}
                        >
                            闘技場
                        </h2>
                        <h5
                            className={`${dotFont.className} text-2xl text-white drop-shadow-xl`}
                        >
                            オンラインモード
                        </h5>
                    </div>
                </Card>

                <Card
                onClick={() => router.push("/practice")}
                onMouseEnter={() => setSelected(2)}
                className={`${dotFont.className} relative flex-1 transition ${
                    selected === 2 ? "scale-102 ring-4 ring-yellow-400" : ""
                }`}
                >
                <Image
                    fill
                    src="/images/back-ground/practice-select1.png"
                    alt="試練の塔"
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute bottom-6 left-6">
                        <h2
                            className={`${dotFont.className} text-5xl text-white drop-shadow-xl`}
                        >
                            試練の塔
                        </h2>
                        <h5
                            className={`${dotFont.className} text-2xl text-white drop-shadow-xl`}
                        >
                            練習モード
                        </h5>
                    </div>
                </Card>
            </div>
          </div> 
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>

          <DialogTitle className={`${dotFont.className} text-3xl`}>
            🔒 ロック中
          </DialogTitle>

          <DialogDescription className={`${dotFont.className} text-lg mt-4`}>
            このモードはログインすると遊べます。
          </DialogDescription>

          <div className="flex justify-end gap-4 mt-6">

            <Button
            
              onClick={() => 
                router.push("/login")}
            >
              ログイン
            </Button>

          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}