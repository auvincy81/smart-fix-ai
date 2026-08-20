import { PlaceholderPage } from "@/components/placeholder-page";

export default function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Customer records will include contact details, vehicles, repair history, concerns, and future service recommendations."
      planned={["Customer contact profiles", "Linked vehicles", "Repair and visit history", "Service recommendations and communication"]}
    />
  );
}
