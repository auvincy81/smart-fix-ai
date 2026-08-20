import { PlaceholderPage } from "@/components/placeholder-page";

export default function VehiclesPage() {
  return (
    <PlaceholderPage
      title="Vehicles"
      description="Vehicle profiles will contain VIN data, mileage, ownership, service history, diagnostic records, and future recommendations."
      planned={["VIN and factory vehicle details", "Mileage and plate information", "Linked customer ownership", "Diagnosis and repair history"]}
    />
  );
}
