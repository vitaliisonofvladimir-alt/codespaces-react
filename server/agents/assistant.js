import { Agent, run } from "@openai/agents";

export const assistantAgent = new Agent({
  name: "Assistant",
  model: "gpt-5-mini",
  instructions:
    "You are a helpful assistant. Answer clearly and concisely.",
});

export async function runAssistant(
  message,
  { runner = run } = {}
) {
  const result = await runner(assistantAgent, message);

  return result.finalOutput;
}
