export interface CategorySummary {
  category: string;
  tokenTally: number;
}

export interface ClassificationResult {
  category: string | null;
  score: number;
}

export interface PersistedCategoryState {
  tally: number;
  tokens: Record<string, number>;
}

export interface PersistedTokenizerConfig {
  language: string;
  removeStopWords: boolean;
}

export interface PersistedModelState {
  version: number;
  categories: Record<string, PersistedCategoryState>;
  tokenizer?: PersistedTokenizerConfig;
}
