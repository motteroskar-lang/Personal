import { NextRequest, NextResponse } from "next/server";
import { generateTodayBriefing } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { plans } = await req.json();
    const briefing = await generateTodayBriefing(plans ?? []);
    return NextResponse.json({ briefing });
  } catch {
    return NextResponse.json({ briefing: "" });
  }
}
