import { Agent, run } from "@openai/agents";

export const assistantAgent = new Agent({
  name: "Assistant",
  instructions:
    "You are a helpful assistant. Answer clearly and concisely.",
});

export async function runAssistant(message) {
  const result = await run(assistantAgent, message);

  return result.finalOutput;
}
