import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(conversations);
}

export async function POST() {
  const conversation = await prisma.conversation.create({ data: {} });
  return NextResponse.json(conversation, { status: 201 });
}
