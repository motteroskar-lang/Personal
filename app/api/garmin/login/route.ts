import { NextRequest, NextResponse } from "next/server";
import { initSchema } from "@/lib/db";
import { garminConnectLogin, saveGarminSession } from "@/lib/garmin-connect";

export async function POST(req: NextRequest) {
  await initSchema();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email und Passwort erforderlich" }, { status: 400 });
  }

  try {
    const result = await garminConnectLogin(email, password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await saveGarminSession(result.session, result.displayName);
    return NextResponse.json({ ok: true, displayName: result.displayName });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
