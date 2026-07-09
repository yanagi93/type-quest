"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import { Button } from "@/components/ui/8bit/button";

type StoryDialogueProps = {
  open: boolean;
  lines: string[];
  onComplete: () => void;
  title?: string;
};

// イントロ・単語習得・エンディングで共用する、1行ずつ読み進める会話ウィンドウ。
export function StoryDialogue({ open, lines, onComplete, title }: StoryDialogueProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open, lines]);

  const isLast = step >= lines.length - 1;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      event.preventDefault();

      if (isLast) {
        onComplete();
      } else {
        setStep((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLast, onComplete]);

  if (!open || lines.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className={title ? undefined : "sr-only"}>
            {title || "ものがたり"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-base leading-relaxed min-h-[4lh]">{lines[step]}</p>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">Enterキーで{isLast ? "とじる" : "つづける"}</p>

          <Button
            onClick={() => (isLast ? onComplete() : setStep((prev) => prev + 1))}
          >
            {isLast ? "とじる" : "つづける"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
