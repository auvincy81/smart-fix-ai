import { JobEditor } from "@/components/jobs/job-editor";
export default async function EditWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <JobEditor kind="work-order" id={(await params).id} />;
}
