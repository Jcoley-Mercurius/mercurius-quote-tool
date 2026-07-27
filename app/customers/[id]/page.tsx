import { CustomerDetailWorkspace } from "@/components/customers/CustomerDetailWorkspace";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailWorkspace customerId={id} />;
}
