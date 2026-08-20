import { PlaceholderPage } from "@/components/placeholder-page";

export default function WorkOrdersPage() {
  return (
    <PlaceholderPage
      title="Work Orders"
      description="Manage customer concerns, diagnosis, technician work, services, inspections, approvals, and completion status."
      planned={["Customer complaint and technician notes", "Diagnosis and inspection linkage", "Services, labor, and repair status", "Customer approval and completion workflow"]}
    />
  );
}
