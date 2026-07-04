const SUPABASE_ERROR_MAP: [RegExp, string][] = [
  [/invalid login credentials/i, "Incorrect email or password. Please try again."],
  [/email not confirmed/i, "Please confirm your email before signing in."],
  [/user already registered/i, "An account with this email already exists. Try signing in."],
  [/password should be at least/i, "Password must be at least 6 characters."],
  [/unable to validate email/i, "Please enter a valid email address."],
  [/email rate limit exceeded/i, "Too many attempts. Please wait a few minutes and try again."],
  [/network|fetch failed|failed to fetch/i, "Network error. Check your connection and try again."],
  [/jwt expired|session expired/i, "Your session expired. Please sign in again."],
  [/row-level security|permission denied/i, "You don't have permission to perform this action."],
  [
    /could not find the (table|function).*organization/i,
    "Team workspaces are not set up in Supabase yet. Run migrations 003_organizations.sql and 004_organization_invites.sql in the SQL Editor.",
  ],
  [/duplicate key|already exists/i, "This record already exists."],
  [/storage.*object not found/i, "Logo file not found. Try uploading again."],
  [/payload too large|file size/i, "File is too large. Please use a smaller image."],
];

export function friendlyError(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  for (const [pattern, message] of SUPABASE_ERROR_MAP) {
    if (pattern.test(raw)) return message;
  }

  if (raw.length > 120) return fallback;

  return raw;
}