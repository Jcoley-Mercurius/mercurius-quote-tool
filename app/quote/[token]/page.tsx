import { ClientQuoteFlow } from "@/components/client-portal/ClientQuoteFlow";

interface ClientQuotePageProps {
  params: Promise<{ token: string }>;
}

export default async function ClientQuotePage({ params }: ClientQuotePageProps) {
  const { token } = await params;
  return <ClientQuoteFlow token={token} />;
}