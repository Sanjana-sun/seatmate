import { NextResponse } from "next/server";
import { rateUser, reputationOf } from "@/lib/store";

// Post-show peer rating. This is the trust flywheel: repeated low ratings
// pull a user's reputation down until the matcher stops pairing them.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { userId, stars } = body ?? {};
  if (typeof userId !== "string" || typeof stars !== "number") {
    return NextResponse.json({ error: "userId and stars required" }, { status: 400 });
  }
  if (!rateUser(userId, stars)) return NextResponse.json({ error: "invalid rating" }, { status: 400 });
  return NextResponse.json({ reputation: reputationOf(userId) });
}
