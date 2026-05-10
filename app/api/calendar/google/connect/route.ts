import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?error=google_not_configured", req.url));
  }
  const origin = new URL(req.url).origin;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL ?? `${origin}/api/calendar/google/callback`;
  const scope = "https://www.googleapis.com/auth/calendar.readonly";
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;
  return NextResponse.redirect(authUrl);
}
