import bigrams from "./bigrams.json" with { type: "json" };

const PUNCTUATION = [".", "!", "?"];
const LETTERS = Array.from("abcdefghijklmnopqrstuvwxyz");

// frequency of starting letters
const WORD_START_FREQ = [
  0.1154, 0.043, 0.052, 0.032, 0.028, 0.04, 0.016, 0.042, 0.073, 0.0051, 0.0086,
  0.024, 0.038, 0.023, 0.076, 0.043, 0.0022, 0.028, 0.067, 0.16, 0.012, 0.0082,
  0.055, 0.00045, 0.0076, 0.00045,
];

// word length distribution
const WORD_LEN_DISTRIBUTION = [
  0.031500223549973574, 0.1717270251595334, 0.21533959273259357,
  0.15851725399341543, 0.10974271430313375, 0.08657480795024995,
  0.07316180953542249, 0.05690362963866195, 0.04064544974190139,
  0.027435678575783436, 0.01524204365321302, 0.009145226191927812,
  0.004064544974190139,
];
const WORD_LENS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Build bigram lookup: last letter -> [bigrams[], normalised freqs[]]
const lastLetterToChoices: Record<string, { keys: string[]; probs: number[] }> = {};
(() => {
  const tmp: Record<string, Array<[string, number]>> = {};
  (bigrams as [string, number][]).forEach(([bg, freq]) => {
    const last = bg[0];
    if (!tmp[last]) tmp[last] = [];
    tmp[last].push([bg, freq]);
  });
  for (const [last, arr] of Object.entries(tmp)) {
    const total = arr.reduce((s, [, f]) => s + f, 0);
    const keys = arr.map(([bg]) => bg);
    const probs = arr.map(([, f]) => f / total);
    lastLetterToChoices[last] = { keys, probs };
  }
})();

function weightedChoice<T>(items: T[], probs: number[]): T {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += probs[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

function discreteChoice<T>(items: T[], probs: number[]): T {
  return weightedChoice(items, probs);
}

export function genWord(): string {
  const start = discreteChoice(LETTERS, WORD_START_FREQ);
  let word = start;
  const wordLen = discreteChoice(WORD_LENS, WORD_LEN_DISTRIBUTION) as number;
  for (let i = 0; i < wordLen; i++) {
    const last = word[word.length - 1];
    const choices = lastLetterToChoices[last];
    if (!choices) {
      word += LETTERS[Math.floor(Math.random() * LETTERS.length)];
      continue;
    }
    const newBigram = weightedChoice(choices.keys, choices.probs);
    word += newBigram[newBigram.length - 1];
  }
  return word;
}

export function genParagraph(
  maxLen: number | null | undefined,
  sentenceBounds: [number, number] = [4, 8],
  wordBounds: [number, number] = [5, 15],
): { text: string; hitMaxLength: boolean } {
  let out = "";
  const nSent = randInt(sentenceBounds[0], sentenceBounds[1]);
  let sinceLastBreak = 0;

  for (let s = 0; s < nSent; s++) {
    const nWords = randInt(wordBounds[0], wordBounds[1]);
    for (let wi = 0; wi < nWords; wi++) {
      if (maxLen && out.length > maxLen) {
        return { text: out.trim(), hitMaxLength: true };
      }
      let word = genWord();
      if (wi === 0) word = word[0].toUpperCase() + word.slice(1);
      out += word;
      if (wi < nWords - 1) {
        if ((out.length - sinceLastBreak) < 80) {
          out += " ";
        } else {
          out += " \n";
          sinceLastBreak = out.length;
        }
      }
    }
    out += PUNCTUATION[Math.floor(Math.random() * PUNCTUATION.length)];
    out += " ";
  }
  return { text: out.trim(), hitMaxLength: false };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
