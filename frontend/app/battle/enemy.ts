// regular: 通常のフロアで出現する雑魚
// boss: 5階ごとのボス階でのみ出現する（regularには出てこない）
export const enemies = {
  easy: {
    regular: [
      {
        id: 1,
        name: "スライム",
        hp: 80,
        images: [
          "/images/enemy/slime/slime1.png",
          "/images/enemy/slime/slime2.png",
          "/images/enemy/slime/slime3.png",
          "/images/enemy/slime/slime4.png",
          "/images/enemy/slime/slime5.png",
        ],
        score: 100,
        // 何ターンに1回攻撃してくるか
        attackInterval: 2,
        // 倒すと一定確率でこの魔法を落とす（null=落とさない）
        dropsMagic: "ice",
      },
      {
        id: 2,
        name: "コウモリ",
        hp: 90,
        images: [
          "/images/enemy/bat/bat1.png",
          "/images/enemy/bat/bat2.png",
          "/images/enemy/bat/bat3.png",
          "/images/enemy/bat/bat4.png",
          "/images/enemy/bat/bat5.png",
        ],
        score: 120,
        attackInterval: 1,
        dropsMagic: "lightning",
      },
    ],
    boss: [
      {
        id: 3,
        name: "ゴブリン",
        hp: 100,
        images: [
          "/images/enemy/goblin/goblin1.png",
          "/images/enemy/goblin/goblin2.png",
          "/images/enemy/goblin/goblin3.png",
          "/images/enemy/goblin/goblin4.png",
          "/images/enemy/goblin/goblin5.png",
        ],
        score: 150,
        attackInterval: 2,
        dropsMagic: "fire",
      },
    ],
  },

  normal: {
    regular: [
      {
        id: 4,
        name: "オーク",
        hp: 150,
        images: ["/images/enemy/oak/oak1.png", "/images/enemy/oak/oak2.png"],
        score: 250,
        attackInterval: 2,
        dropsMagic: "ice",
      },
      {
        id: 5,
        name: "ウルフ",
        hp: 170,
        images: [
          "/images/enemy/wolf/wolf1.png",
          "/images/enemy/wolf/wolf2.png",
          "/images/enemy/wolf/wolf3.png",
          "/images/enemy/wolf/wolf4.png",
          "/images/enemy/wolf/wolf5.png",
        ],
        score: 280,
        attackInterval: 1,
        dropsMagic: "lightning",
      },
    ],
    boss: [
      {
        id: 6,
        name: "ゴーレム",
        hp: 200,
        images: [
          "/images/enemy/golem/golem1.png",
          "/images/enemy/golem/golem2.png",
          "/images/enemy/golem/golem3.png",
          "/images/enemy/golem/golem4.png",
          "/images/enemy/golem/golem5.png",
        ],
        score: 350,
        attackInterval: 3,
        dropsMagic: "fire",
      },
    ],
  },

  hard: {
    // 上級の雑魚は「少し強いオーク・ウルフ」（画像は使い回し、ステータスを強化）
    regular: [
      {
        id: 10,
        name: "強オーク",
        hp: 230,
        images: ["/images/enemy/oak/oak1.png", "/images/enemy/oak/oak2.png"],
        score: 320,
        attackInterval: 2,
        dropsMagic: "ice",
      },
      {
        id: 11,
        name: "強ウルフ",
        hp: 250,
        images: [
          "/images/enemy/wolf/wolf1.png",
          "/images/enemy/wolf/wolf2.png",
          "/images/enemy/wolf/wolf3.png",
          "/images/enemy/wolf/wolf4.png",
          "/images/enemy/wolf/wolf5.png",
        ],
        score: 340,
        attackInterval: 1,
        dropsMagic: "lightning",
      },
    ],
    // ボス階でのみ出現する（ランダムで1体）
    boss: [
      {
        id: 7,
        name: "ドラゴン",
        hp: 300,
        images: [
          "/images/enemy/dragon/dragon1.png",
          "/images/enemy/dragon/dragon2.png",
          "/images/enemy/dragon/dragon3.png",
          "/images/enemy/dragon/dragon4.png",
        ],
        score: 500,
        attackInterval: 2,
        dropsMagic: "ice",
      },
      {
        id: 8,
        name: "魔王",
        hp: 380,
        images: [
          "/images/enemy/demonking/demonking1.png",
          "/images/enemy/demonking/demonking2.png",
        ],
        score: 700,
        attackInterval: 1,
        dropsMagic: "fire",
      },
      {
        id: 9,
        name: "フェニックス",
        hp: 450,
        images: [
          "/images/enemy/phoenix/phoenix1.png",
          "/images/enemy/phoenix/phoenix2.png",
          "/images/enemy/phoenix/phoenix3.png",
        ],
        score: 900,
        attackInterval: 3,
        dropsMagic: "lightning",
      },
    ],
  },
} as const;

// ストーリーモード第1章専用の敵。試練の塔のenemiesとは別枠で管理する。
// regular（フィールドの雑魚）は既存のスライム・ゴブリンをそのまま再利用。
// boss（スライムキング）はスライムの画像を流用したプレースホルダー（専用グラフィックは後で差し替え予定）。
export const storyEnemies = {
  chapter1: {
    regular: [enemies.easy.regular[0], enemies.easy.boss[0]],
    boss: [
      {
        id: 100,
        name: "スライムキング",
        hp: 260,
        images: [
          "/images/enemy/slime/slime1.png",
          "/images/enemy/slime/slime2.png",
          "/images/enemy/slime/slime3.png",
          "/images/enemy/slime/slime4.png",
          "/images/enemy/slime/slime5.png",
        ],
        score: 300,
        attackInterval: 2,
        dropsMagic: null,
      },
    ],
  },
};
