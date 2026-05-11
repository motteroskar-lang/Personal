import { NextRequest, NextResponse } from "next/server";
import { dbRun, initSchema } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=google_auth_failed", req.url));
  }

  try {
    const origin = new URL(req.url).origin;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL ?? `${origin}/api/calendar/google/callback`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) throw new Error("Token exchange failed");
    const tokenData = await res.json();

    await initSchema();
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_tokens', ?, unixepoch())",
      [JSON.stringify({ ...tokenData, expires_at: Date.now() + (tokenData.expires_in ?? 3600) * 1000 })]
    );

    return NextResponse.redirect(new URL("/settings?success=google_connected", req.url));
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/settings?error=google_auth_failed", req.url));
  }
}
