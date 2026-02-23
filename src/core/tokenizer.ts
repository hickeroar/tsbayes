import { algorithms, newStemmer } from "snowball-stemmers";
import { get as getStopwords } from "./stopwords/index.js";

const NON_WORD_SPLIT = /[^\p{L}\p{N}]+/u;

const stemmerCache = new Map<string, ReturnType<typeof newStemmer>>();

function getStemmer(lang: string): ReturnType<typeof newStemmer> {
  const normalized = lang.toLowerCase().trim();
  const resolved = algorithms().includes(normalized) ? normalized : "english";
  let stemmer = stemmerCache.get(resolved);
  if (!stemmer) {
    stemmer = newStemmer(resolved);
    stemmerCache.set(resolved, stemmer);
  }
  return stemmer;
}

export interface TokenizerOptions {
  language?: string;
  removeStopWords?: boolean;
  /** @internal For testing: override stemmer to simulate errors. */
  _stemmer?: { stem: (word: string) => string };
}

/**
 * Creates a tokenizer with the given language and stop-word settings.
 * Pipeline: NFKC normalize -> lowercase -> split -> stem -> optional stopword filter.
 * Unsupported language falls back to "english".
 */
export function createTokenizer(options?: TokenizerOptions): (text: string) => string[] {
  const language = options?.language ?? "english";
  const removeStopWords = options?.removeStopWords ?? false;
  const lang = language.toLowerCase().trim();
  const stemmer = options?._stemmer ?? getStemmer(lang);
  const stopSet = removeStopWords ? getStopwords(lang) : null;

  return function tokenizeText(text: string): string[] {
    const tokens = text
      .normalize("NFKC")
      .toLowerCase()
      .split(NON_WORD_SPLIT)
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map((token) => {
        try {
          const stemmed = stemmer.stem(token);
          return stemmed !== "" ? stemmed : token;
        } catch {
          return token;
        }
      });

    if (stopSet && stopSet.size > 0) {
      return tokens.filter((t) => !stopSet.has(t));
    }
    return tokens;
  };
}

const defaultTokenizer = createTokenizer({ language: "english", removeStopWords: false });

/**
 * Default tokenizer: English, no stopword removal.
 * Pipeline: NFKC normalize -> lowercase -> split -> stem.
 */
export function tokenize(text: string): string[] {
  return defaultTokenizer(text);
}
