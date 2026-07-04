"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  acceptOrganizationInvite,
  fetchOrganizationInvitePreview,
} from "@/lib/organizations/invites";
import type { OrganizationInvitePreview } from "@/lib/organizations/types";
import { refreshWorkspaceStore, setActiveWorkspace } from "@/lib/organizations/store";
import { formatShortDate } from "@/lib/quotes/helpers";
import { toastError, toastSuccess } from "@/lib/ui/toast";

interface InviteAcceptFlowProps {
  token: string;
}

export function InviteAcceptFlow({ token }: InviteAcceptFlowProps) {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [preview, setPreview] = useState<OrganizationInvitePreview | null | undefined>(
    undefined
  );
  const [isAccepting, setIsAccepting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loginHref = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(preview?.email ?? "")}`;
  const signupHref = `${loginHref}&mode=signup`;

  useEffect(() => {
    let cancelled = false;

    fetchOrganizationInvitePreview(token)
      .then((nextPreview) => {
        if (cancelled) return;
        setPreview(nextPreview);
        if (!nextPreview) {
          setLoadError("This invite link is invalid or no longer exists.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load invite details."
        );
        setPreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const userEmail = user?.email?.trim().toLowerCase() ?? null;
  const emailMatches =
    preview && userEmail ? userEmail === preview.email.toLowerCase() : false;

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptOrganizationInvite(token);
      await refreshWorkspaceStore();
      setActiveWorkspace({
        type: "organization",
        organizationId: result.organizationId,
        name: result.organizationName,
      });
      toastSuccess(`You joined ${result.organizationName}.`);
      router.replace("/quotes");
    } catch (error) {
      toastError(error, "Could not accept invite. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) {
      toastError(result.error, "Could not sign out. Please try again.");
    }
  };

  if (preview === undefined || authLoading) {
    return <InviteStateCard message="Loading invite..." />;
  }

  if (loadError || preview === null) {
    return (
      <InviteStateCard
        title="Invite not found"
        message={loadError ?? "This invite link is invalid."}
        action={
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
          >
            Go to sign in
          </Link>
        }
      />
    );
  }

  if (preview.acceptedAt) {
    return (
      <InviteStateCard
        title="Invite already accepted"
        message={`This invite to ${preview.organizationName} was already accepted.`}
        action={
          user ? (
            <Link
              href="/quotes"
              className="inline-flex rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
            >
              Go to quotes
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
            >
              Sign in
            </Link>
          )
        }
      />
    );
  }

  if (preview.isExpired) {
    return (
      <InviteStateCard
        title="Invite expired"
        message={`This invite to join ${preview.organizationName} expired on ${formatShortDate(preview.expiresAt)}. Ask an admin to send a new invite.`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mercurius-100 text-mercurius-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Join {preview.organizationName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;ve been invited as a{" "}
          <span className="font-medium text-slate-700">{preview.role}</span>.
        </p>
      </div>

      <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Invited email</dt>
          <dd className="font-medium text-slate-900">{preview.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Expires</dt>
          <dd className="font-medium text-slate-900">{formatShortDate(preview.expiresAt)}</dd>
        </div>
      </dl>

      {!user ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-600">
            Sign in or create an account with{" "}
            <span className="font-medium">{preview.email}</span> to accept this invite.
          </p>
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white hover:bg-mercurius-700"
          >
            Sign in to accept
          </Link>
          <Link
            href={signupHref}
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      ) : emailMatches ? (
        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={isAccepting}
          className="mt-6 w-full rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
        >
          {isAccepting ? "Joining team..." : `Join ${preview.organizationName}`}
        </button>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You&apos;re signed in as <span className="font-medium">{user.email}</span>,
            but this invite was sent to <span className="font-medium">{preview.email}</span>.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out and use invited email
          </button>
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white hover:bg-mercurius-700"
          >
            Sign in as {preview.email}
          </Link>
        </div>
      )}
    </div>
  );
}

function InviteStateCard({
  title,
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
      {title && <h1 className="text-xl font-semibold text-slate-900">{title}</h1>}
      <p className={title ? "mt-2 text-sm text-slate-600" : "text-sm text-slate-600"}>
        {message}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}