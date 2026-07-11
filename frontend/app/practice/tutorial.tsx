"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/8bit/carousel";

type Slide = {
  title: string;
  // スクリーンショットのパス。用意できていないスライドはnullでプレースホルダーを表示する
  image: string | null;
  body: string[];
};

const SLIDES: Slide[] = [
  {
    title: "① 白い文字と黒い文字の違い",
    image:  "/images/tutorial/slide1.png",
    body: [
      "「アタックチャンス！」の間に流れる単語は白色。これは自分の攻撃です。",
      "「てきの こうげき！」の間に流れる単語は黒色。これは敵の攻撃を防ぐための単語です。",
      "どちらも打ち方は同じですが、意味が違うので色をよく見ましょう。",
    ],
  },
  {
    title: "② 敵を倒すと時間が増える",
    image: null,
    body: [
      "画面上部の「⏱」は残り時間です。0になるとゲームオーバー。",
      "敵を1体倒すごとに残り時間が回復します。倒せば倒すほど長く遊べます。",
    ],
  },
  {
    title: "③ 魔法の使い方",
    image: null,
    body: [
      "敵を倒すと炎・氷・雷のいずれかの魔法を落とすことがあります。",
      "自分の攻撃番のときに 1 / 2 / 3 キーを押すと、好きなタイミングでその魔法を選べます。",
      "選んだ状態の単語（色が変わります）を打ち切ると魔法が発動。炎は大ダメージ、氷は敵の動きを遅くする、雷は敵全体への攻撃です。",
      "もう一度同じキーを押すと選択を解除できます。",
    ],
  },
  {
    title: "④ フロアについて",
    image: null,
    body: [
      "敵を全滅させると次の階（フロア）に進みます。",
      "階が上がるほど単語が長く・流れる速さも速くなっていきます。",
      "5階ごとに強力なボスが1体だけ出現します。",
    ],
  },
  {
    title: "⑤ レベルアップ（宝箱）について",
    image: null,
    body: [
      "階をクリアするたびに、宝箱から強化アイテムを1つ手に入れます。",
      "攻撃力の書・防御力の書・体力の書・炎/氷/雷の魔法の書のいずれかがランダムで手に入ります。",
      "宝箱を開いている間はゲームが止まります。Enterキーを押すと次の階へ進みます。",
    ],
  },
];

type TutorialProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Tutorial({ open, onOpenChange }: TutorialProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        max-h + overflow-y-auto: スライドの中身（特に画像＋長い箇条書き）が
        ダイアログの高さより長くなることがあり、それだとダイアログの外に
        はみ出してしまう。ダイアログ自体を画面の85%までの高さに制限し、
        それを超えた分は中でスクロールできるようにして、はみ出しを防ぐ。
        （横方向のPrev/Nextボタンのクリック対策で外側のCarouselには
        overflow-hiddenを付けられないので、縦方向はこちらで制御する）
      */}
      {/*
        max-w-2xl だけでは効かない: ベースのDialogContent（components/ui/dialog.tsx）が
        `sm:max-w-sm` を持っており、Tailwindの生成CSSではレスポンシブ指定（sm:）が
        無指定のクラスより後ろに置かれるため、640px以上の画面では sm:max-w-sm が
        max-w-2xl より後勝ちしてダイアログが384pxまで縮んでしまう（実際に横あふれの
        原因になっていた）。同じ sm: バリアントで上書きすることで tailwind-merge が
        正しく後勝ちさせてくれる。
      */}
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>あそびかた</DialogTitle>
        </DialogHeader>

        {/*
          注意: このCarouselのラップ div には overflow-hidden を付けないこと。
          Prev/Nextボタンはこの外側（-right-14など負のマージン）に配置されているため、
          ここでoverflow-hiddenにすると2つのボタンごと見えなくなり、押せなくなる。
          スライドの中身を隠す処理（横にはみ出したスライドを隠す）はCarouselContent内部の
          div がすでに担っているので、外側のCarouselには不要。
        */}
        <Carousel className="w-full px-4">
          <CarouselContent>
            {SLIDES.map((slide, i) => (
              <CarouselItem key={i}>
                <div className="flex flex-col items-center gap-4 p-4 min-w-0">
                  {slide.image ? (
                    <div className="w-full max-h-72 min-w-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="max-w-full max-h-72 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gray-800 border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-400 text-sm">
                      （ここにスクリーンショットが入ります）
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-center">
                    {slide.title}
                  </h3>

                  <ul className="text-sm space-y-2 text-left w-full">
                    {slide.body.map((line, j) => (
                      <li key={j}>・{line}</li>
                    ))}
                  </ul>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
