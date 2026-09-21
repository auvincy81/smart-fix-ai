import { JobList, type JobSearch } from "@/components/jobs/job-list";
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<JobSearch> }) {
  return <JobList kind="appointment" search={await searchParams} />;
}
