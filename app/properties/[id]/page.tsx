import { PropertyDetailWorkspace } from "@/components/properties/PropertyDetailWorkspace";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PropertyDetailWorkspace propertyId={id} />;
}
