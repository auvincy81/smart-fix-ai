import { JobList, type JobSearch } from "@/components/jobs/job-list";
export default async function WorkOrdersPage({ searchParams }: { searchParams: Promise<JobSearch> }) {
  return <JobList kind="work-order" search={await searchParams} />;
}
