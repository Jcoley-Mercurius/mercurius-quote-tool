"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  consumeNewUserWelcomePending,
  consumeWelcomePending,
  pruneStaleNewUserWelcomeFlag,
} from "@/lib/auth/welcome";
import { toastSuccess } from "@/lib/ui/toast";
import { useAuth } from "./AuthProvider";

const AUTH_PATHS = ["/login", "/auth/reset-password"];

export function WelcomeToast() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const hasShown = useRef(false);

  useEffect(() => {
    pruneStaleNewUserWelcomeFlag();
    if (isLoading || !user || hasShown.current) return;
    if (AUTH_PATHS.includes(pathname)) return;
    if (consumeNewUserWelcomePending()) {
      hasShown.current = true;
      toastSuccess("Welcome to Mercurius! Your account has been created.");
      return;
    }

    if (!consumeWelcomePending()) return;

    hasShown.current = true;
    const firstName =
      user.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "there";
    toastSuccess(`Welcome back, ${firstName}!`);
  }, [user, isLoading, pathname]);

  return null;
}