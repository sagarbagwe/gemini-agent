import type { MessageRole } from "@prisma/client";
import { buildContext } from "./context";
import { streamGemini } from "./gemini";

type AgentMessage = { role: MessageRole; content: string };

export function runAgent(messages: AgentMessage[], currentMessage: string) {
  return streamGemini(buildContext(messages, currentMessage));
}
