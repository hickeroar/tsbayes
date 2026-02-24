import { describe, expect, it, vi } from "vitest";

import { truncate, verboseLog } from "../../src/server/verbose-logger.js";

describe("verboseLog", () => {
  it("logs when verbose is true", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    verboseLog(true, "test");
    expect(errorSpy).toHaveBeenCalledWith("[tsbayes]", "test");
    errorSpy.mockRestore();
  });

  it("does not log when verbose is false", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    verboseLog(false, "test");
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("truncate", () => {
  it("returns string unchanged when within maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ... when exceeding maxLen", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
    expect(truncate("x".repeat(300), 200)).toBe("x".repeat(200) + "...");
  });
});
