import { PlaceholderPage } from "@/components/placeholder-page";

export default function AppointmentsPage() {
  return (
    <PlaceholderPage
      title="Appointments"
      description="Organize customer appointment requests, concerns, vehicles, shop scheduling, check-in, and service status."
      planned={["Customer appointment requests", "Calendar and shop schedule", "Vehicle and concern details", "Check-in and appointment status"]}
    />
  );
}
