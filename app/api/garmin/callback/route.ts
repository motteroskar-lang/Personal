import { NextRequest, NextResponse } from "next/server";
import { dbRun, initSchema } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("oauth_token");
  const verifier = searchParams.get("oauth_verifier");

  if (!token || !verifier) {
    return NextResponse.redirect(new URL("/settings?error=garmin_auth_failed", req.url));
  }

  try {
    await initSchema();
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('garmin_tokens', ?, unixepoch())",
      [JSON.stringify({ token, verifier, connected_at: new Date().toISOString() })]
    );

    return NextResponse.redirect(new URL("/settings?success=garmin_connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?error=garmin_auth_failed", req.url));
  }
}
