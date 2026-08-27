import { describe, expect, test } from "vitest";
import { assistantAgent } from "./assistant.js";

describe("assistantAgent", () => {
  test("creates an agent with expected configuration", () => {
    expect(assistantAgent.name).toBe("Assistant");
    expect(assistantAgent.instructions).toContain("helpful assistant");
  });
});
