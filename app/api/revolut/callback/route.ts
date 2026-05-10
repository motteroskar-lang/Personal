import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=revolut_auth_failed", req.url));
  }

  try {
    const base = process.env.REVOLUT_ENVIRONMENT === "sandbox"
      ? "https://sandbox-b2b.revolut.com/api/1.0"
      : "https://b2b.revolut.com/api/1.0";

    const res = await fetch(`${base}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.REVOLUT_CLIENT_ID ?? "",
        client_secret: process.env.REVOLUT_CLIENT_SECRET ?? "",
        redirect_uri: process.env.REVOLUT_CALLBACK_URL ?? "http://localhost:3000/api/revolut/callback",
      }),
    });

    if (!res.ok) throw new Error("Token exchange failed");
    const tokenData = await res.json();

    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('revolut_token', ?)").run(
      JSON.stringify({ ...tokenData, expires_at: Date.now() + (tokenData.expires_in ?? 3600) * 1000 })
    );

    return NextResponse.redirect(new URL("/settings?success=revolut_connected", req.url));
  } catch (err) {
    console.error("Revolut OAuth error:", err);
    return NextResponse.redirect(new URL("/settings?error=revolut_auth_failed", req.url));
  }
}
