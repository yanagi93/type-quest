"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/8bit/card";
import { DotGothic16 } from "next/font/google";

const dotFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
});

const levels = [
  {
    title: "初級",
    path: "/battle?mode=practice&level=easy",
    bg: "/images/back-ground/easy.png",
  },
  {
    title: "中級",
    path: "/battle?mode=practice&level=normal",
    bg: "/images/back-ground/normal.png",
  },
  {
    title: "上級",
    path: "/battle?mode=practice&level=hard",
    bg: "/images/back-ground/hard.png",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.key === "ArrowRight") {
        setSelected((prev) => (prev + 1) % levels.length);
      }

      if (event.key === "ArrowLeft") {
        setSelected((prev) => (prev - 1 + levels.length) % levels.length);
      }

      if (event.key === "Enter") {
        router.push(levels[selected].path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, router]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">

      {/* 背景 */}
      <Image
        src="/images/back-ground/practice.png"
        alt="背景"
        fill
        className="object-cover"
        priority
      />

      {/* UIレイヤー */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-10 translate-x-20">

        <Card
          className={`
            ${dotFont.className}
            w-[200px] h-[80px]
            flex items-center justify-center
            mb-2
            bg-black/60
            border-2 border-cyan-400
            text-cyan-300
            tracking-widest
          `}
        >
          <h1 className="text-2xl">
            難易度選択
          </h1>
        </Card>

        {/* カード群 */}
        <div className="flex justify-center gap-10 w-[700px] mt-10">

          {levels.map((level, index) => (
            <Card
              key={level.title}
              onClick={() => router.push(level.path)}
              onMouseEnter={() => setSelected(index)}
              className={`
                ${dotFont.className}
                w-[340px] h-[420px]
                bg-cover bg-center
                transition-all duration-200

                ${
                  selected === index
                    ? "scale-102 opacity-100 ring-4 ring-red-400 shadow-[0_0_25px_rgba(255,0,0,0.35)]"
                    : "opacity-70 hover:opacity-95"
                }
              `}
              style={{
                backgroundImage: `url(${level.bg})`,
              }}
            >
              <div className="h-full flex flex-col justify-end px-4 pb-5">
                <h2 className="text-6xl text-white drop-shadow-lg">
                  {level.title}
                </h2>
              </div>
            </Card>
          ))}

        </div>

      </div>
    </div>
  );
}