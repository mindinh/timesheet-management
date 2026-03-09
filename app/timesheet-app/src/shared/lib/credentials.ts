/**
 * Credential storage backed by sessionStorage.
 * - Survives page reloads (same tab)
 * - Cleared automatically when the tab is closed
 * - In-memory cache avoids repeated sessionStorage reads
 */

const SESSION_KEY = 'ts_credentials';

let _credentials: string = sessionStorage.getItem(SESSION_KEY) ?? '';

export function setCredentials(username: string, password: string): void {
  _credentials = `${username}:${password}`;
  sessionStorage.setItem(SESSION_KEY, _credentials);
}

export function getCredentials(): string {
  return _credentials;
}

export function clearCredentials(): void {
  _credentials = '';
  sessionStorage.removeItem(SESSION_KEY);
}

/** Returns stored credentials if any (for auto-restore on app init). */
export function getStoredCredentials(): { username: string; password: string } | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const idx = stored.indexOf(':');
  if (idx === -1) return null;
  return {
    username: stored.slice(0, idx),
    password: stored.slice(idx + 1),
  };
}
