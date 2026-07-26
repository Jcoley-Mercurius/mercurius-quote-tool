import { OpportunityDetailWorkspace } from "@/components/opportunities/OpportunityDetailWorkspace";

interface OpportunityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OpportunityDetailPage({
  params,
}: OpportunityDetailPageProps) {
  const { id } = await params;
  return <OpportunityDetailWorkspace opportunityId={id} />;
}
