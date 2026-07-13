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
    image: "/images/tutorial/slide2.png",
    body: [
      "画面上部の「⏱」は残り時間です。0になるとゲームオーバー。",
      "敵を1体倒すごとに残り時間が回復します。倒せば倒すほど長く遊べます。",
    ],
  },
  {
    title: "③ 魔法の使い方",
    image: "/images/tutorial/slide3.png",
    body: [
      "敵を倒すと炎・氷・雷のいずれかの魔法を落とすことがあります。",
      "自分の攻撃番のときに 1 / 2 / 3 キーを押すと、好きなタイミングでその魔法を選べます。",
      "選んだ状態の単語（色が変わります）を打ち切ると魔法が発動。炎は大ダメージ、氷は敵の動きを遅くする、雷は敵全体への攻撃です。",
      "もう一度同じキーを押すと選択を解除できます。",
    ],
  },
  {
    title: "④ フロアについて",
    image: "/images/tutorial/slide4.png",
    body: [
      "敵を全滅させると次の階（フロア）に進みます。",
      "階が上がるほど単語が長く・流れる速さも速くなっていきます。",
      "5階ごとに強力なボスが1体だけ出現します。",
    ],
  },
  {
    title: "⑤ レベルアップ（宝箱）について",
    image: "/images/tutorial/slide5.png",
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
        max-w-2xl だけでは効かない: ベースのDialogContent（components/ui/dialog.tsx）が
        `sm:max-w-sm` を持っており、Tailwindの生成CSSではレスポンシブ指定（sm:）が
        無指定のクラスより後ろに置かれるため、640px以上の画面では sm:max-w-sm が
        max-w-2xl より後勝ちしてダイアログが384pxまで縮んでしまう（実際に横あふれの
        原因になっていた）。同じ sm: バリアントで上書きすることで tailwind-merge が
        正しく後勝ちさせてくれる。

        スクロールはさせない方針：以前はmax-h-[85vh] overflow-y-autoで縦のはみ出しを
        中スクロールに逃がしていたが、overflow-y-autoを付けるとCSSの仕様上overflow-x
        まで暗黙にautoになり、ダイアログの外側にはみ出す配置のPrev/Nextボタンの
        クリック判定が壊れる副作用があった（詳しくはCarousel側のコメント参照）。
        今は各スライドの画像を必ず同じ固定サイズの箱（下のimg参照）に収めているので、
        スライドごとに高さがバラつかず、そもそも中身がダイアログの高さを超えにくい。
        スクロール自体を無くしてこの副作用の芽を断っている。
      */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>あそびかた</DialogTitle>
        </DialogHeader>

        {/*
          修正済みのバグ: CarouselPrevious/Nextは標準では負のマージン（-right-14等）で
          ダイアログの外側にはみ出す位置に配置される。以前はこれで見た目上は問題なかったが、
          DialogContentに`overflow-y-auto`を付けた影響でCSSの仕様上`overflow-x`も暗黙に
          `auto`（＝はみ出した部分をクリップ）になり、ボタンの右端がDialogContentの実際の
          箱からわずかにはみ出す形になっていた。見た目のクリップ自体は目立たなかったが、
          はみ出した部分はクリック判定（ヒットテスト）がDialogContentの背後にある
          オーバーレイに奪われてしまい、ボタンを押しても反応しない状態になっていた。
          対策として、ボタンをダイアログの外側にはみ出させず、内側（left-2/right-2）に
          収まる位置に変更している。
        */}
        <Carousel className="w-full px-4">
          <CarouselContent>
            {SLIDES.map((slide, i) => (
              <CarouselItem key={i}>
                <div className="flex flex-col items-center gap-4 p-4 min-w-0">
                  {/*
                    画像の有無・元のサイズや縦横比に関わらず、スライドごとに箱の大きさが
                    バラつかないよう、常にw-full h-64の固定サイズの箱にする（object-containで
                    箱からはみ出さずに収める。小さい画像や違う比率の画像は箱の中で
                    余白ができるだけで、箱自体の大きさは変わらない）
                  */}
                  {slide.image ? (
                    <div className="w-full h-64 min-w-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-800 border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-400 text-sm">
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
          <CarouselPrevious className="left-2 md:left-2" />
          <CarouselNext className="right-2 md:right-2" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
