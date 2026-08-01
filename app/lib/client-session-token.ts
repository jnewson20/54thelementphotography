import crypto from "crypto";

export const CLIENT_SESSION_COOKIE = "54th-element-client-session";
const DEFAULT_SECRET = "54th-element-client-session-secret";

export type ClientSessionTokenPayload = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret() {
  return process.env.CLIENT_SESSION_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

function base64UrlEncode(text: string) {
  return Buffer.from(text, "utf8").toString("base64url");
}

function base64UrlDecode(text: string) {
  return Buffer.from(text, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function issueClientSessionToken(username: string, ttlSeconds = 60 * 60 * 12) {
  const issuedAt = Date.now();
  const payload: ClientSessionTokenPayload = {
    username: username.trim(),
    issuedAt,
    expiresAt: issuedAt + ttlSeconds * 1000,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyClientSessionToken(token?: string | null) {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const safeProvided = Buffer.from(signature);
  const safeExpected = Buffer.from(expected);
  if (safeProvided.length !== safeExpected.length || !crypto.timingSafeEqual(safeProvided, safeExpected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as Partial<ClientSessionTokenPayload>;
    if (!parsed.username || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) return null;

    return {
      username: parsed.username,
      issuedAt: parsed.issuedAt ?? Date.now(),
      expiresAt: parsed.expiresAt,
    } satisfies ClientSessionTokenPayload;
  } catch {
    return null;
  }
}
