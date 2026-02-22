import { CATEGORY_PATTERN, MODEL_VERSION } from "./constants.js";
import { PersistenceError, ValidationError } from "./errors.js";
import { tokenize } from "./tokenizer.js";
import type { CategorySummary, ClassificationResult, PersistedModelState } from "./types.js";

interface CategoryState {
  tally: number;
  tokens: Map<string, number>;
}

export class TextClassifier {
  private readonly categories = new Map<string, CategoryState>();

  public train(category: string, text: string): void {
    this.validateCategory(category);
    const tokens = tokenize(text);
    const tokenOccurrences = countOccurrences(tokens);
    const state = this.ensureCategory(category);

    for (const [token, count] of tokenOccurrences) {
      const currentCount = state.tokens.get(token) ?? 0;
      state.tokens.set(token, currentCount + count);
      state.tally += count;
    }
  }

  public untrain(category: string, text: string): void {
    this.validateCategory(category);
    const state = this.categories.get(category);
    if (!state) {
      return;
    }

    const tokenOccurrences = countOccurrences(tokenize(text));
    for (const [token, count] of tokenOccurrences) {
      const existing = state.tokens.get(token) ?? 0;
      if (existing <= 0) {
        continue;
      }

      const decrement = Math.min(existing, count);
      const nextValue = existing - decrement;
      state.tally -= decrement;

      if (nextValue <= 0) {
        state.tokens.delete(token);
      } else {
        state.tokens.set(token, nextValue);
      }
    }

    if (state.tally <= 0) {
      this.categories.delete(category);
    }
  }

  public score(text: string): Record<string, number> {
    const tokens = tokenize(text);
    const occurrences = countOccurrences(tokens);
    const totalTally = this.totalTally();
    if (totalTally <= 0) {
      return {};
    }

    const scores = new Map<string, number>();
    for (const [token, occurrenceCount] of occurrences) {
      const tokenTotal = this.tokenTotal(token);
      if (tokenTotal <= 0) {
        continue;
      }

      for (const [name, state] of this.categories) {
        const tokenInCategory = state.tokens.get(token) ?? 0;
        const probability = this.calculateBayesianProbability({
          tokenInCategory,
          tokenTotal,
          categoryTally: state.tally,
          totalTally
        });
        const current = scores.get(name) ?? 0;
        scores.set(name, current + occurrenceCount * probability);
      }
    }

    const response: Record<string, number> = {};
    for (const [category, value] of scores) {
      if (value > 0) {
        response[category] = value;
      }
    }
    return response;
  }

  public classify(text: string): string | null {
    return this.classificationResult(text).category;
  }

  public classificationResult(text: string): ClassificationResult {
    const scores = this.score(text);
    const categories = Object.keys(scores).sort((a, b) => a.localeCompare(b));
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const category of categories) {
      const score = scores[category] ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return { category: bestCategory, score: bestScore };
  }

  public flush(): void {
    this.categories.clear();
  }

  public categorySummaries(): CategorySummary[] {
    return [...this.categories.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, state]) => ({
        category,
        tokenTally: state.tally
      }));
  }

  public save(): PersistedModelState {
    const categories: PersistedModelState["categories"] = {};
    for (const [name, state] of this.categories) {
      categories[name] = {
        tally: state.tally,
        tokens: Object.fromEntries(state.tokens)
      };
    }

    return {
      version: MODEL_VERSION,
      categories
    };
  }

  public load(model: PersistedModelState): void {
    validateModelState(model);

    this.categories.clear();
    for (const [name, persisted] of Object.entries(model.categories)) {
      const tokens = new Map<string, number>();
      let tally = 0;
      for (const [token, count] of Object.entries(persisted.tokens)) {
        tokens.set(token, count);
        tally += count;
      }
      this.categories.set(name, { tally, tokens });
    }
  }

  private ensureCategory(category: string): CategoryState {
    const existing = this.categories.get(category);
    if (existing) {
      return existing;
    }

    const created: CategoryState = { tally: 0, tokens: new Map<string, number>() };
    this.categories.set(category, created);
    return created;
  }

  private validateCategory(category: string): void {
    if (!CATEGORY_PATTERN.test(category)) {
      throw new ValidationError("invalid category");
    }
  }

  private totalTally(): number {
    let total = 0;
    for (const state of this.categories.values()) {
      total += state.tally;
    }
    return total;
  }

  private tokenTotal(token: string): number {
    let total = 0;
    for (const state of this.categories.values()) {
      total += state.tokens.get(token) ?? 0;
    }
    return total;
  }

  private calculateBayesianProbability(input: {
    tokenInCategory: number;
    tokenTotal: number;
    categoryTally: number;
    totalTally: number;
  }): number {
    const { tokenInCategory, tokenTotal, categoryTally, totalTally } = input;
    if (categoryTally <= 0 || totalTally <= 0) {
      return 0;
    }

    const categoryPrior = categoryTally / totalTally;
    const nonCategoryPrior = 1 - categoryPrior;
    const inCategoryProb = tokenInCategory / categoryTally;

    const remainingTally = totalTally - categoryTally;
    const nonCategoryTokenCount = tokenTotal - tokenInCategory;
    const notInCategoryProb =
      remainingTally > 0 && nonCategoryTokenCount > 0 ? nonCategoryTokenCount / remainingTally : 0;

    const numerator = inCategoryProb * categoryPrior;
    const denominator = numerator + notInCategoryProb * nonCategoryPrior;
    if (!Number.isFinite(denominator) || denominator <= 0) {
      return 0;
    }

    return numerator / denominator;
  }
}

export function validateModelState(model: PersistedModelState): void {
  if (model.version !== MODEL_VERSION) {
    throw new PersistenceError("unsupported model version");
  }

  for (const [name, category] of Object.entries(model.categories)) {
    if (!CATEGORY_PATTERN.test(name)) {
      throw new PersistenceError("invalid category in model");
    }
    if (!Number.isInteger(category.tally) || category.tally < 0) {
      throw new PersistenceError("invalid tally in model");
    }

    let sum = 0;
    for (const [token, count] of Object.entries(category.tokens)) {
      if (token.length === 0) {
        throw new PersistenceError("invalid token in model");
      }
      if (!Number.isInteger(count) || count <= 0) {
        throw new PersistenceError("invalid token count in model");
      }
      sum += count;
    }

    if (sum !== category.tally) {
      throw new PersistenceError("inconsistent tally in model");
    }
  }
}

function countOccurrences(tokens: string[]): Map<string, number> {
  const occurrences = new Map<string, number>();
  for (const token of tokens) {
    occurrences.set(token, (occurrences.get(token) ?? 0) + 1);
  }
  return occurrences;
}
