import { JobEditor } from "@/components/jobs/job-editor";
export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ customerId?: string; vehicleId?: string }> }) {
  return <JobEditor kind="appointment" prefill={await searchParams} />;
}
