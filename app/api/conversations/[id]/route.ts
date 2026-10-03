import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  return NextResponse.json(conversation);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { title?: unknown };
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }
  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title: body.title.trim().slice(0, 80) },
  });
  return NextResponse.json(conversation);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
