import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runAgent } from "@/lib/ai/agent";

export const runtime = "nodejs";

type ChatRequest = { conversationId?: unknown; message?: unknown };

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.conversationId !== "string" || typeof body.message !== "string") {
    return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
  }
  const message = body.message.trim();
  if (!message || message.length > 20_000) {
    return NextResponse.json({ error: "Message must be between 1 and 20,000 characters" }, { status: 400 });
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id: body.conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: message } });
  if (conversation.title === "New conversation") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: message.replace(/\s+/g, " ").slice(0, 42) + (message.length > 42 ? "..." : "") },
    });
  }
  let stream;
  try {
    stream = await runAgent(conversation.messages, message);
  } catch (error) {
    console.error("Gemini request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to contact Gemini" }, { status: 502 });
  }
  const encoder = new TextEncoder();
  let assistantText = "";
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text ?? "";
          if (!text) continue;
          assistantText += text;
          controller.enqueue(encoder.encode(text));
        }
        if (assistantText) await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: assistantText } });
        controller.close();
      } catch (error) {
        console.error("Gemini stream failed", error);
        controller.error(error);
      }
    },
  });
  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" },
  });
}
