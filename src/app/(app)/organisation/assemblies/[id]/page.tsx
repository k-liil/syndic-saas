import AssemblyDetailClient from "@/components/assemblies/AssemblyDetailClient";

export default async function AssemblyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AssemblyDetailClient meetingId={id} />;
}
