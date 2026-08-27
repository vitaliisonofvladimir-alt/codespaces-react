import { Agent, run, tool } from "@openai/agents";
import { getCurrentTime } from "./tools/time.js";

const currentTimeTool = tool({
  name: "get_current_time",
  description: "Returns the current date and time.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    return getCurrentTime();
  },
});

export const assistantAgent = new Agent({
  name: "Assistant",
  model: "gpt-5-mini",
  instructions:
    "You are a helpful assistant. Answer clearly and concisely. Use tools when needed.",
  tools: [
    currentTimeTool,
  ],
});

export async function runAssistant(
  message,
  { runner = run } = {}
) {
  const result = await runner(assistantAgent, message);

  return result.finalOutput;
}
