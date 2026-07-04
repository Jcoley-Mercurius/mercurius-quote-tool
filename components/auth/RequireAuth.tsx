"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "./AuthProvider";

const AUTH_PUBLIC_PATHS = ["/login", "/auth/reset-password"];

function isInvitePath(pathname: string): boolean {
  return pathname.startsWith("/invite/");
}

function isClientQuotePath(pathname: string): boolean {
  return pathname.startsWith("/quote/");
}

function isSafeRedirect(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isConfigured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPublicPage =
    AUTH_PUBLIC_PATHS.includes(pathname) ||
    isInvitePath(pathname) ||
    isClientQuotePath(pathname);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoading || !isConfigured) return;

    if (!user && !isAuthPublicPage) {
      router.replace("/login");
      return;
    }

    if (user && isLoginPage) {
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      router.replace(isSafeRedirect(redirect) ? redirect : "/");
    }
  }, [user, isLoading, isConfigured, isAuthPublicPage, isLoginPage, router]);

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Supabase not configured
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading your account..." />;
  }

  if (!user && !isAuthPublicPage) {
    return <LoadingState message="Redirecting to sign in..." />;
  }

  if (user && isLoginPage) {
    return <LoadingState message="Redirecting..." />;
  }

  return <>{children}</>;
}