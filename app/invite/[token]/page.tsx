import { InviteAcceptFlow } from "@/components/organizations/InviteAcceptFlow";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <InviteAcceptFlow token={token} />;
}