import { describe, expect, it } from "vitest";

import { get, supported, supportedLanguages } from "../../src/core/stopwords/index.js";

describe("stopwords", () => {
  it("supported returns true for english", () => {
    expect(supported("english")).toBe(true);
  });

  it("supported returns true for spanish", () => {
    expect(supported("spanish")).toBe(true);
  });

  it("supported returns false for unsupported language", () => {
    expect(supported("unsupported")).toBe(false);
  });

  it("supported returns false for empty string", () => {
    expect(supported("")).toBe(false);
  });

  it("get returns non-null set for english", () => {
    const en = get("english");
    expect(en).not.toBeNull();
    expect(en).toBeInstanceOf(Set);
  });

  it("get returns set containing 'the' for english", () => {
    const en = get("english");
    expect(en).not.toBeNull();
    expect(en!.has("the")).toBe(true);
  });

  it("get returns null for unsupported language", () => {
    expect(get("nosuchlang")).toBeNull();
  });

  it("get returns set for tamil", () => {
    const ta = get("tamil");
    expect(ta).not.toBeNull();
    expect(ta!.size).toBeGreaterThan(0);
  });

  it("get returns set for porter mapping to english", () => {
    const porter = get("porter");
    expect(porter).not.toBeNull();
    expect(porter!.has("the")).toBe(true);
  });

  it("supportedLanguages returns array matching snowball-stemmers", () => {
    const langs = supportedLanguages();
    expect(Array.isArray(langs)).toBe(true);
    expect(langs).toContain("english");
    expect(langs).toContain("spanish");
    expect(langs).toContain("french");
  });
});
