"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { VendorSettingsForm } from "@/components/vendor/VendorSettingsForm";
import { OrganizationMembersSettings } from "@/components/organizations/OrganizationMembersSettings";
import { OrganizationTeamSettings } from "@/components/organizations/OrganizationTeamSettings";
import { OrganizationAuditLogSettings } from "@/components/organizations/OrganizationAuditLogSettings";
import { OrganizationJobPhotosSettings } from "@/components/organizations/OrganizationJobPhotosSettings";
import { PersonalJobPhotosSettings } from "@/components/organizations/PersonalJobPhotosSettings";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "profile" | "team" | "photos";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const profileIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path
      fillRule="evenodd"
      d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z"
      clipRule="evenodd"
    />
  </svg>
);

const teamIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
  </svg>
);

const photosIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path
      fillRule="evenodd"
      d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Settings Tabs ────────────────────────────────────────────────────────────

export function SettingsTabs() {
  const { workspace } = useWorkspace();
  const isOrganization = workspace.type === "organization";

  const tabs: Tab[] = [
    { id: "profile", label: "Business Profile", icon: profileIcon },
    ...(isOrganization
      ? [{ id: "team" as TabId, label: "Team", icon: teamIcon }]
      : []),
    { id: "photos", label: "Photos & Storage", icon: photosIcon },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // If workspace changes away from org, reset to profile tab if on team
  const resolvedActive =
    activeTab === "team" && !isOrganization ? "profile" : activeTab;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === resolvedActive;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-mercurius-700 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-700",
              ].join(" ")}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div
        id={`settings-panel-${resolvedActive}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${resolvedActive}`}
      >
        {resolvedActive === "profile" && <ProfileTab />}
        {resolvedActive === "team" && isOrganization && <TeamTab />}
        {resolvedActive === "photos" && <PhotosTab isOrganization={isOrganization} />}
      </div>
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function ProfileTab() {
  return <VendorSettingsForm />;
}

function TeamTab() {
  return (
    <div className="space-y-6">
      <OrganizationMembersSettings />
      <OrganizationTeamSettings />
      <OrganizationAuditLogSettings />
    </div>
  );
}

function PhotosTab({ isOrganization }: { isOrganization: boolean }) {
  return (
    <div className="space-y-6">
      <PersonalJobPhotosSettings />
      {isOrganization && <OrganizationJobPhotosSettings />}
    </div>
  );
}
