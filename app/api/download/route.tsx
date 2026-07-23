// app/api/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Mock session validation.
 * Replace with real session or token validation (cookies, JWT, NextAuth, etc.)
 */
function validateMockSession(req: NextRequest) {
  // Example: allow request for demonstration only.
  // Implement actual checks: cookies, Authorization header, session lookup.
  // Return { ok: true } or { ok: false, status, message }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const validation = validateMockSession(req);
  if (!validation.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fileParam = url.searchParams.get("file");
  if (!fileParam) {
    return NextResponse.json({ error: "file parameter required" }, { status: 400 });
  }

  // Basic path sanitization: ensure fileParam starts with /assets/
  if (!fileParam.startsWith("/assets/")) {
    return NextResponse.json({ error: "invalid file path" }, { status: 400 });
  }

  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.join(publicDir, fileParam.replace(/^\//, "")); // remove leading slash

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const res = new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(fileBuffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
  return res;
}
