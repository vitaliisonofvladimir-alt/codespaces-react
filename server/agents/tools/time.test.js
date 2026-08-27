import { describe, expect, test } from "vitest";
import { getCurrentTime } from "./time.js";

describe("getCurrentTime tool", () => {
  test("returns a valid ISO date string", () => {
    const result = getCurrentTime();

    expect(typeof result).toBe("string");
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).toISOString()).toBe(result);
  });
});
