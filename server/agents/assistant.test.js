import { describe, expect, test } from "vitest";
import { assistantAgent, runAssistant } from "./assistant.js";

describe("assistantAgent", () => {
  test("creates an agent with expected configuration", () => {
    expect(assistantAgent.name).toBe("Assistant");
    expect(assistantAgent.instructions).toContain("helpful assistant");
  });

  test("runs assistant with mocked runner", async () => {
    const fakeRunner = async (agent, message) => {
      expect(agent).toBe(assistantAgent);
      expect(message).toBe("Hello");
  test("registers current time tool", () => {
    expect(assistantAgent.tools).toHaveLength(1);
  });
      return {
        finalOutput: "Mock response",
      };
    };

    const result = await runAssistant("Hello", {
      runner: fakeRunner,
    });

    expect(result).toBe("Mock response");
  });
});
