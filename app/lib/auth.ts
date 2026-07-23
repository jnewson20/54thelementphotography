const CLIENT_SESSION_STORAGE_KEY = "54th-element-client-auth-v1";
const ADMIN_AUTH_STORAGE_KEY = "54th-element-admin-auth-v1";
const TEMP_ADMIN_PASSWORD_STORAGE_KEY = "54th-element-admin-temp-password-v1";

type ClientSession = {
  username: string;
  loggedInAt: string;
};

function normalizeUsername(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function saveClientSession(username: string) {
  const storage = getStorage();
  const payload = JSON.stringify({ username: username.trim(), loggedInAt: new Date().toISOString() });

  try {
    if (storage) {
      storage.setItem(CLIENT_SESSION_STORAGE_KEY, payload);
      return;
    }
  } catch {
    // Fall back to sessionStorage when localStorage is full.
  }

  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, payload);
    }
  } catch {
    // Ignore when browser blocks storage entirely.
  }
}

export function getClientSession(): ClientSession | null {
  const storage = getStorage();
  const raw =
    storage?.getItem(CLIENT_SESSION_STORAGE_KEY) ||
    (typeof window !== "undefined" ? window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY) : null);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ClientSession>;
    if (!parsed.username) return null;
    return { username: parsed.username, loggedInAt: parsed.loggedInAt ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

export function clearClientSession() {
  const storage = getStorage();
  storage?.removeItem(CLIENT_SESSION_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
  }
}

export function isClientSessionValid(username?: string | null) {
  const session = getClientSession();
  if (!session || !username) return false;
  return normalizeUsername(session.username) === normalizeUsername(username);
}

export function setAdminAuthenticated(authenticated: boolean) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(ADMIN_AUTH_STORAGE_KEY, authenticated ? "true" : "false");
}

export function isAdminAuthenticated() {
  const storage = getStorage();
  if (!storage) return false;

  return storage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";
}

export function clearAdminAuthentication() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export function saveTemporaryAdminPassword(password: string) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(TEMP_ADMIN_PASSWORD_STORAGE_KEY, JSON.stringify({ password, createdAt: Date.now() }));
}

export function consumeTemporaryAdminPassword(password: string) {
  const storage = getStorage();
  if (!storage) return false;

  const raw = storage.getItem(TEMP_ADMIN_PASSWORD_STORAGE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as { password?: string; createdAt?: number };
    const isMatch = parsed.password === password;
    if (isMatch) {
      storage.removeItem(TEMP_ADMIN_PASSWORD_STORAGE_KEY);
      return true;
    }

    return false;
  } catch {
    storage.removeItem(TEMP_ADMIN_PASSWORD_STORAGE_KEY);
    return false;
  }
}

export function clearTemporaryAdminPassword() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(TEMP_ADMIN_PASSWORD_STORAGE_KEY);
}
