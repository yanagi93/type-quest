// ひらがな1文字（または拗音2文字）ごとに、入力として認める
// ローマ字表記を複数登録しておく（例: し→shi/si）。
// 配列の先頭が「デフォルトで表示するローマ字」になる。
export const ROMAJI_TABLE: Record<string, string[]> = {
  あ: ["a"], い: ["i"], う: ["u"], え: ["e"], お: ["o"],
  か: ["ka"], き: ["ki"], く: ["ku"], け: ["ke"], こ: ["ko"],
  さ: ["sa"], し: ["shi", "si"], す: ["su"], せ: ["se"], そ: ["so"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  わ: ["wa"], を: ["wo"], ん: ["n", "nn"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],

  きゃ: ["kya"], きゅ: ["kyu"], きょ: ["kyo"],
  しゃ: ["sha", "sya"], しゅ: ["shu", "syu"], しょ: ["sho", "syo"],
  ちゃ: ["cha", "tya"], ちゅ: ["chu", "tyu"], ちょ: ["cho", "tyo"],
  にゃ: ["nya"], にゅ: ["nyu"], にょ: ["nyo"],
  ひゃ: ["hya"], ひゅ: ["hyu"], ひょ: ["hyo"],
  みゃ: ["mya"], みゅ: ["myu"], みょ: ["myo"],
  りゃ: ["rya"], りゅ: ["ryu"], りょ: ["ryo"],
  ぎゃ: ["gya"], ぎゅ: ["gyu"], ぎょ: ["gyo"],
  じゃ: ["ja", "zya"], じゅ: ["ju", "zyu"], じょ: ["jo", "zyo"],
  びゃ: ["bya"], びゅ: ["byu"], びょ: ["byo"],
  ぴゃ: ["pya"], ぴゅ: ["pyu"], ぴょ: ["pyo"],
};

const SMALL_Y = new Set(["ゃ", "ゅ", "ょ"]);

export type WordUnit = {
  // 表示用のかな（1〜2文字）
  kana: string;
  // このユニットとして認めるローマ字表記（先頭がデフォルト表示）
  candidates: string[];
};

// ん が「n」1文字だけで確定してよいか（次のユニットと紛れないか）を判定する
function isAmbiguousBeforeN(nextCandidates: string[] | undefined): boolean {
  if (!nextCandidates) return false;

  return nextCandidates.some((c) => /^[aiueony]/.test(c));
}

// かな文字列を、タイピング判定の単位（ユニット）の配列に変換する。
// - 拗音（きゃ等）は2文字で1ユニット
// - 促音（っ）は次のユニットの子音を重ねる形に展開する
// - ん は直後のユニットと紛れる場合だけ「nn」必須にする
export function buildWordUnits(kanaWord: string): WordUnit[] {
  const chars = Array.from(kanaWord);
  const units: WordUnit[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === "っ") {
      const hasYoon = !!chars[i + 2] && SMALL_Y.has(chars[i + 2]);
      const nextKana = hasYoon ? chars[i + 1] + chars[i + 2] : chars[i + 1];
      const base = nextKana ? ROMAJI_TABLE[nextKana] : undefined;

      if (base) {
        units.push({
          kana: ch + nextKana,
          candidates: base.map((c) => c[0] + c),
        });
        i += hasYoon ? 2 : 1;
        continue;
      }

      continue;
    }

    if (chars[i + 1] && SMALL_Y.has(chars[i + 1])) {
      const combo = ch + chars[i + 1];
      const candidates = ROMAJI_TABLE[combo];

      if (candidates) {
        units.push({ kana: combo, candidates });
        i += 1;
        continue;
      }
    }

    const candidates = ROMAJI_TABLE[ch];

    if (candidates) {
      units.push({ kana: ch, candidates });
    }
  }

  // ん の直後を見て、紛れる場合は "nn" 必須にする。
  // 単語の最後がんの場合は、rollover先の次のユニットが無く
  // 「n」1文字だけでは確定を保留し続けてしまう（"nn"の途中かもしれないので）ため、
  // 単語末尾に限っては候補を"n"だけにして、1文字打った時点で確定できるようにする
  for (let i = 0; i < units.length; i++) {
    if (units[i].kana !== "ん") continue;

    const next = units[i + 1];

    if (!next) {
      units[i] = { ...units[i], candidates: ["n"] };
      continue;
    }

    const ambiguous = isAmbiguousBeforeN(next.candidates);

    units[i] = { ...units[i], candidates: ambiguous ? ["nn"] : ["n", "nn"] };
  }

  return units;
}
