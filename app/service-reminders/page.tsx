import { PlaceholderPage } from "@/components/placeholder-page";

export default function ServiceRemindersPage() {
  return (
    <PlaceholderPage
      title="Service Reminders"
      description="Track recommended future maintenance by date or mileage and help shops follow up with customers."
      planned={["Date-based service reminders", "Mileage-based recommendations", "Priority and estimated cost", "Scheduled, completed, or declined status"]}
    />
  );
}
