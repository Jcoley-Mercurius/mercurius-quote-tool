const ACTIVE_WORKSPACE_KEY = "mercurius-active-workspace";

export function loadActiveWorkspaceKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

export function saveActiveWorkspaceKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, key);
}

export function clearActiveWorkspaceKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}