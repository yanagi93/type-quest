"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/8bit/button";
import { cn } from "@/lib/utils";

type HomeButtonProps = {
  className?: string;
};

// どの画面からでもホーム画面へ戻れる共通ボタン
export function HomeButton({ className }: HomeButtonProps) {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/home")}
      className={cn("fixed top-6 left-10 z-50", className)}
    >
      🏠 ホーム
    </Button>
  );
}
