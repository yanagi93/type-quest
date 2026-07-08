import type { Difficulty } from "./difficulty";

export type WordEntry = { kana: string; kanji: string };

// kana: タイピング判定に使う読み（ローマ字への変換はromaji.tsが担当）
// kanji: 画面中央に表示する見た目（漢字。common kanjiが無い単語だけ例外的にカタカナ/ひらがな）
// 短い単語〜長い単語まで幅を持たせてあり、pickWordForFloorが
// 難易度と階層に応じて「どのくらいの長さの単語が出やすいか」を調整する（kanaの文字数で判定）。
export const words: Record<Difficulty, WordEntry[]> = {
  easy: [
    // 短い（2〜3文字）
    { kana: "ねこ", kanji: "猫" },
    { kana: "いぬ", kanji: "犬" },
    { kana: "とり", kanji: "鳥" },
    { kana: "はな", kanji: "花" },
    { kana: "みず", kanji: "水" },
    { kana: "やま", kanji: "山" },
    { kana: "うみ", kanji: "海" },
    { kana: "そら", kanji: "空" },
    { kana: "あめ", kanji: "雨" },
    { kana: "くも", kanji: "雲" },
    { kana: "ゆき", kanji: "雪" },
    { kana: "あか", kanji: "赤" },
    { kana: "あお", kanji: "青" },
    { kana: "しろ", kanji: "白" },
    { kana: "くろ", kanji: "黒" },
    { kana: "ほん", kanji: "本" },
    { kana: "きりん", kanji: "キリン" },
    { kana: "うさぎ", kanji: "ウサギ" },
    { kana: "さかな", kanji: "魚" },
    { kana: "くるま", kanji: "車" },
    { kana: "つくえ", kanji: "机" },
    { kana: "たまご", kanji: "卵" },
    // 中くらい（4〜5文字）
    { kana: "ひまわり", kanji: "向日葵" },
    { kana: "たんぽぽ", kanji: "たんぽぽ" },
    { kana: "あさがお", kanji: "朝顔" },
    { kana: "ひこうき", kanji: "飛行機" },
    { kana: "えんぴつ", kanji: "鉛筆" },
    { kana: "かたつむり", kanji: "かたつむり" },
  ],

  normal: [
    // 短め（3文字）
    { kana: "きっぷ", kanji: "切符" },
    { kana: "ざっし", kanji: "雑誌" },
    { kana: "きゃく", kanji: "客" },
    { kana: "おちゃ", kanji: "お茶" },
    { kana: "でんわ", kanji: "電話" },
    { kana: "がっき", kanji: "楽器" },
    // 中くらい（4〜5文字）
    { kana: "がっこう", kanji: "学校" },
    { kana: "せんせい", kanji: "先生" },
    { kana: "でんしゃ", kanji: "電車" },
    { kana: "じてんしゃ", kanji: "自転車" },
    { kana: "ともだち", kanji: "友達" },
    { kana: "きょうしつ", kanji: "教室" },
    { kana: "しゃしん", kanji: "写真" },
    { kana: "べんきょう", kanji: "勉強" },
    { kana: "おんがく", kanji: "音楽" },
    { kana: "びょういん", kanji: "病院" },
    { kana: "しんぶん", kanji: "新聞" },
    { kana: "りょこう", kanji: "旅行" },
    { kana: "けっこん", kanji: "結婚" },
    { kana: "どうぶつえん", kanji: "動物園" },
    { kana: "ゆうえんち", kanji: "遊園地" },
    // ちょい長め（6〜9文字）
    { kana: "たんじょうび", kanji: "誕生日" },
    { kana: "すいえいきょうしつ", kanji: "水泳教室" },
    { kana: "おたんじょうびかい", kanji: "お誕生日会" },
    // 超長め（10文字〜）
    { kana: "おたんじょうびおめでとう", kanji: "お誕生日おめでとう" },
  ],

  hard: [
    // 中くらい（4〜5文字）
    { kana: "しゅくだい", kanji: "宿題" },
    { kana: "びょうしつ", kanji: "病室" },
    { kana: "しゃちょう", kanji: "社長" },
    { kana: "りょうしん", kanji: "両親" },
    { kana: "じゅうしょ", kanji: "住所" },
    { kana: "としょかん", kanji: "図書館" },
    // ちょい長め（6〜7文字）
    { kana: "けいさつかん", kanji: "警察官" },
    { kana: "しょうぼうしゃ", kanji: "消防車" },
    { kana: "びじゅつかん", kanji: "美術館" },
    { kana: "がいこくじん", kanji: "外国人" },
    { kana: "おきゃくさん", kanji: "お客さん" },
    { kana: "ぎゅうにゅう", kanji: "牛乳" },
    { kana: "きょうかしょ", kanji: "教科書" },
    { kana: "しんかんせん", kanji: "新幹線" },
    { kana: "ゆうびんきょく", kanji: "郵便局" },
    { kana: "しょうがっこう", kanji: "小学校" },
    { kana: "ちゅうがっこう", kanji: "中学校" },
    { kana: "きゅうきゅうしゃ", kanji: "救急車" },
    // 長め（8〜9文字）
    { kana: "こうつうしんごう", kanji: "交通信号" },
    { kana: "しょうぼうちょう", kanji: "消防庁" },
    // 超長め（10文字〜）
    { kana: "がっこうのとしょかん", kanji: "学校の図書館" },
    { kana: "びょういんのせんせい", kanji: "病院の先生" },
    { kana: "おおきなこうつうじこ", kanji: "大きな交通事故" },
    { kana: "こうつうあんぜんきょういく", kanji: "交通安全教育" },
  ],
};
