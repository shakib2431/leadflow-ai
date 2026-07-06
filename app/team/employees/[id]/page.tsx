import { redirect } from "next/navigation";

export default async function TeamEmployeeRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/hrms/v2/employees/${id}`);
}
