import { NextResponse } from "next/server";
import { leaveGroup } from "@/lib/store";

// Graceful exit: drop from your matched group to a solo seat, no friction.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = leaveGroup(id);
  if (!result.ok) return NextResponse.json({ error: "cannot leave" }, { status: 400 });
  return NextResponse.json(result);
}
