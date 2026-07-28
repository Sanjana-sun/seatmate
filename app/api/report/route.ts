import { NextResponse } from "next/server";
import { reportUser, reputationOf } from "@/lib/store";

// Safety report. A few reports block a user from future matching entirely.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { userId } = body ?? {};
  if (typeof userId !== "string") return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!reportUser(userId)) return NextResponse.json({ error: "unknown user" }, { status: 400 });
  return NextResponse.json({ reputation: reputationOf(userId) });
}
