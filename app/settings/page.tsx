import { OrganizationAuditLogSettings } from "@/components/organizations/OrganizationAuditLogSettings";
import { OrganizationJobPhotosSettings } from "@/components/organizations/OrganizationJobPhotosSettings";
import { OrganizationMembersSettings } from "@/components/organizations/OrganizationMembersSettings";
import { PersonalJobPhotosSettings } from "@/components/organizations/PersonalJobPhotosSettings";
import { OrganizationTeamSettings } from "@/components/organizations/OrganizationTeamSettings";
import { VendorSettingsForm } from "@/components/vendor/VendorSettingsForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <OrganizationMembersSettings />
      <OrganizationTeamSettings />
      <PersonalJobPhotosSettings />
      <OrganizationJobPhotosSettings />
      <OrganizationAuditLogSettings />
      <VendorSettingsForm />
    </div>
  );
}