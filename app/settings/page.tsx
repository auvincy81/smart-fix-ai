import { PlaceholderPage } from "@/components/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Configure the future shop profile, team preferences, service defaults, report information, and application settings."
      planned={["Shop profile and contact information", "Technician and staff settings", "Service and report preferences", "Security and integration settings"]}
    />
  );
}
