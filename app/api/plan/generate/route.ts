import { NextRequest, NextResponse } from "next/server";
import { generateGoalPlan } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, goal, currentState, timeframe, motivation, pastExperience } = body;

    if (!goal || !category) {
      return NextResponse.json({ error: "category and goal are required" }, { status: 400 });
    }

    const plan = await generateGoalPlan({
      category,
      goal,
      currentState: currentState ?? "Not specified",
      timeframe: timeframe ?? "6 months",
      motivation,
      pastExperience,
    });

    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
