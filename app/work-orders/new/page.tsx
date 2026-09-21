import { JobEditor } from "@/components/jobs/job-editor";
export default async function NewWorkOrderPage({ searchParams }: { searchParams: Promise<{ customerId?: string; vehicleId?: string; appointmentId?: string }> }) {
  return <JobEditor kind="work-order" prefill={await searchParams} />;
}
