import { NextResponse } from "next/server";
import { loadContentServer } from "../../../lib/content-server";
import { CLIENT_SESSION_COOKIE, issueClientSessionToken } from "../../../lib/client-session-token";

function normalizeUsername(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
    const username = body?.username?.trim() || "";
    const password = body?.password?.trim() || "";

    if (!username || !password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    const content = await loadContentServer();
    const client = content.clients.find((entry) => normalizeUsername(entry.username) === normalizeUsername(username));

    if (!client || client.password.trim() !== password) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = issueClientSessionToken(client.username);
    const response = NextResponse.json({ ok: true, username: client.username });
    response.cookies.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
  }
}
