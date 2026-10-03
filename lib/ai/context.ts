import type { MessageRole } from "@prisma/client";

type ContextMessage = { role: MessageRole; content: string };

export function buildContext(messages: ContextMessage[], currentMessage: string) {
  return [
    {
      role: "user" as const,
      parts: [
        {
          text: `You are Gemini Agent, a helpful, precise AI assistant. Use Markdown when useful. Be concise but complete.\n\nConversation:\n${messages
            .map((message) => `${message.role}: ${message.content}`)
            .join("\n\n")}\n\nuser: ${currentMessage}`,
        },
      ],
    },
  ];
}
