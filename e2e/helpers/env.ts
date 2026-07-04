export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasE2eLoginCredentials(): boolean {
  return Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
}

export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? "";
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "TestPass123";
export const E2E_SIGNUP_PASSWORD = process.env.E2E_SIGNUP_PASSWORD ?? "TestPass123";