import { newStemmer } from "snowball-stemmers";

const NON_WORD_SPLIT = /[^\p{L}\p{N}]+/u;
const stemmer = newStemmer("english");

export function tokenize(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .split(NON_WORD_SPLIT)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => stemmer.stem(token));
}
