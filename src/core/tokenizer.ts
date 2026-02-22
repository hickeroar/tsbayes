import { newStemmer } from "snowball-stemmers";

const NON_WORD_SPLIT = /[^\p{L}\p{N}]+/u;
const stemmer = newStemmer("english");

/**
 * Default tokenizer used by classifier training/scoring.
 * Pipeline: NFKC normalize -> lowercase -> split -> trim/filter -> stem.
 */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .split(NON_WORD_SPLIT)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => stemmer.stem(token));
}
