/**
 * Stop words for languages supported by snowball-stemmers.
 * Data sourced from stopwords-iso (MIT) and simplebayes (Tamil).
 * Languages match snowball-stemmers algorithms() exactly.
 */

import { createRequire } from "node:module";
import { algorithms } from "snowball-stemmers";

const require = createRequire(import.meta.url);
const stopwordsIso = require("stopwords-iso") as Record<string, string[]>;

// Snowball language name -> ISO 639-1 (stopwords-iso uses ISO codes)
const SNOWBALL_TO_ISO: Record<string, string> = {
  arabic: "ar",
  armenian: "hy",
  basque: "eu",
  catalan: "ca",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  finnish: "fi",
  french: "fr",
  german: "de",
  hungarian: "hu",
  italian: "it",
  irish: "ga",
  norwegian: "no",
  porter: "en",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  spanish: "es",
  slovene: "sl",
  swedish: "sv",
  tamil: "ta",
  turkish: "tr"
};

// Tamil stopwords from simplebayes (stopwords-iso does not include Tamil)
// prettier-ignore
const TAMIL_WORDS = [
  "அங்கு", "அங்கே", "அடுத்த", "அதனால்", "அதன்", "அதற்கு", "அதிக", "அதில்", "அது", "அதே", "அதை", "அந்த", "அந்தக்", "அந்தப்", "அன்று", "அல்லது", "அவன்", "அவரது", "அவர்", "அவர்கள்",
  "அவள்", "அவை", "ஆகிய", "ஆகியோர்", "ஆகும்", "ஆனால்", "இங்கு", "இங்கே", "இடத்தில்", "இடம்", "இதனால்", "இதனை", "இதன்", "இதற்கு", "இதில்", "இது", "இதை", "இந்த", "இந்தக்", "இந்தத்",
  "இந்தப்", "இன்னும்", "இப்போது", "இரு", "இருக்கும்", "இருந்த", "இருந்தது", "இருந்து", "இல்லை", "இவர்", "இவை", "உன்", "உள்ள", "உள்ளது", "உள்ளன", "எந்த", "என", "எனக்", "எனக்கு", "எனப்படும்",
  "எனவும்", "எனவே", "எனினும்", "எனும்", "என்", "என்ன", "என்னும்", "என்பது", "என்பதை", "என்ற", "என்று", "என்றும்", "எல்லாம்", "ஏன்", "ஒரு", "ஒரே", "ஓர்", "கொண்ட", "கொண்டு", "கொள்ள",
  "சற்று", "சிறு", "சில", "சேர்ந்த", "தனது", "தன்", "தவிர", "தான்", "நான்", "நாம்", "நீ", "பற்றி", "பற்றிய", "பல", "பலரும்", "பல்வேறு", "பின்", "பின்னர்", "பிற", "பிறகு",
  "பெரும்", "பேர்", "போது", "போன்ற", "போல", "போல்", "மட்டுமே", "மட்டும்", "மற்ற", "மற்றும்", "மிக", "மிகவும்", "மீது", "முதல்", "முறை", "மேலும்", "மேல்", "யார்", "வந்த", "வந்து",
  "வரும்", "வரை", "வரையில்", "விட", "விட்டு", "வேண்டும்", "வேறு"
];

let cache: Map<string, Set<string>> | null = null;

function buildCache(): Map<string, Set<string>> {
  if (cache) {
    return cache;
  }

  const result = new Map<string, Set<string>>();
  const langs = algorithms();

  for (const lang of langs) {
    const normalized = lang.toLowerCase().trim();
    if (normalized === "tamil") {
      const set = new Set(TAMIL_WORDS.map((w) => w.toLowerCase()));
      result.set(normalized, set);
      continue;
    }

    const iso = SNOWBALL_TO_ISO[normalized];
    const raw = iso ? stopwordsIso[iso] : undefined;
    const words = Array.isArray(raw) ? raw : [];
    const set = new Set(words.map((w: string) => String(w).toLowerCase()));
    result.set(normalized, set);
  }

  cache = result;
  return result;
}

/**
 * Returns the stopword set for the given language. Returns null if the language
 * is not supported by the stemmer.
 */
export function get(lang: string): Set<string> | null {
  const normalized = lang.toLowerCase().trim();
  const c = buildCache();
  return c.has(normalized) ? c.get(normalized)! : null;
}

/**
 * Returns true if the language has a stopword entry (i.e. is supported by the stemmer).
 */
export function supported(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return buildCache().has(normalized);
}

/**
 * Returns the list of languages supported by the stemmer (same as snowball-stemmers algorithms()).
 */
export function supportedLanguages(): string[] {
  return algorithms();
}
