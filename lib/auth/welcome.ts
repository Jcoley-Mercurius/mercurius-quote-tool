const RETURNING_WELCOME_KEY = "mercurius-show-welcome";
const NEW_USER_WELCOME_KEY = "mercurius-new-user-welcome";
const NEW_USER_WELCOME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type NewUserWelcomeFlag = { setAt: number };

function readNewUserWelcomeFlag(raw: string): NewUserWelcomeFlag | null {
  // Legacy plain "1" has no timestamp — treat as stale
  if (raw === "1") return null;

  try {
    const parsed = JSON.parse(raw) as Partial<NewUserWelcomeFlag>;
    if (typeof parsed.setAt === "number" && Number.isFinite(parsed.setAt)) {
      return { setAt: parsed.setAt };
    }
  } catch {
    // Malformed payload
  }

  return null;
}

function isNewUserWelcomeFlagFresh(flag: NewUserWelcomeFlag): boolean {
  return Date.now() - flag.setAt <= NEW_USER_WELCOME_MAX_AGE_MS;
}

function removeNewUserWelcomeFlag(): void {
  localStorage.removeItem(NEW_USER_WELCOME_KEY);
}

/** Returning user signed in — shown on next authenticated page (session-scoped). */
export function markWelcomePending(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURNING_WELCOME_KEY, "1");
}

/** New signup — persists until first authenticated session (survives email confirmation). */
export function markNewUserWelcomePending(): void {
  if (typeof window === "undefined") return;
  const payload: NewUserWelcomeFlag = { setAt: Date.now() };
  localStorage.setItem(NEW_USER_WELCOME_KEY, JSON.stringify(payload));
}

/** Remove expired or malformed new-user welcome flags without consuming. */
export function pruneStaleNewUserWelcomeFlag(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(NEW_USER_WELCOME_KEY);
  if (!raw) return;

  const flag = readNewUserWelcomeFlag(raw);
  if (!flag || !isNewUserWelcomeFlagFresh(flag)) {
    removeNewUserWelcomeFlag();
  }
}

export function consumeNewUserWelcomePending(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(NEW_USER_WELCOME_KEY);
  if (!raw) return false;

  removeNewUserWelcomeFlag();

  const flag = readNewUserWelcomeFlag(raw);
  if (!flag || !isNewUserWelcomeFlagFresh(flag)) {
    return false;
  }

  return true;
}

export function consumeWelcomePending(): boolean {
  if (typeof window === "undefined") return false;
  const pending = sessionStorage.getItem(RETURNING_WELCOME_KEY);
  if (!pending) return false;
  sessionStorage.removeItem(RETURNING_WELCOME_KEY);
  return true;
}