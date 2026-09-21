import { JobEditor } from "@/components/jobs/job-editor";
export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  return <JobEditor kind="appointment" id={(await params).id} />;
}
