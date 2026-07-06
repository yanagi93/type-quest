"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/8bit/button"
import { useRouter } from "next/navigation";
import { DotGothic16 } from "next/font/google";
import { Router } from "lucide-react";

const dotFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  // セレクト機能
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  // キーボード押された時の機能
  useEffect(() => {
    const handleKeyDown = (event:KeyboardEvent)  => {
      if (event.repeat) return;

      if(event.key === "ArrowDown") {
        setSelected((prev) => (prev + 1) % 3);
      }

      if(event.key === "ArrowUp") {
        setSelected((prev) => (prev + 2) % 3 );
      }
      if (event.key === "Enter") {
        if (selected === 0) {
          router.push("/home");
        }
        if (selected === 1) {
          router.push("/ranking");
        }
        if (selected === 2) {
          router.push("/setting");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [ selected, router ]);

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

        {/* ロゴ */}
        <div className="absolute inset-0 flex flex-col justify-start pt-12 items-center gap-6 ">
          <Image
            src = "/images/title/title-logo.png"
            alt = "type quest タイトルロゴ"
            width={600}
            height={250}
          />

        {/* ボタン */}
          <Button
            onClick={() => router.push("/home")}
            onMouseEnter={() => setSelected(0)}
            className={`${dotFont.className} text-xl px-8 py-4 transition ${
              selected === 0 ? "scale-110 ring-6 ring-yellow-400" : ""
            }`}
          >
            ゲーム開始
          </Button>
          <Button
            onClick={() => router.push("/ranking")}
            onMouseEnter={() => setSelected(1)}
            className={`${dotFont.className} text-xl px-8 py-4 transition ${
              selected === 1 ? "scale-110 ring-6 ring-yellow-400" : ""
            }`}
          >
            ランキング
          </Button>
          <Button
            onClick={() => router.push("/setting")}
            onMouseEnter={() => setSelected(2)}
            className={`${dotFont.className} text-xl px-8 py-4 transition ${
              selected === 2 ? "scale-110 ring-6 ring-yellow-400" : ""
            }`}
          >
            設定
          </Button>
        </div>
      </div>
    </div>
  );
}