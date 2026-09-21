import { redirect } from "next/navigation";
import { getCurrentShopContext } from "@/lib/auth/session";
import { createShop } from "@/lib/workshop/actions";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/workshop/record-form";

export default async function OnboardingPage() {
  const result = await getCurrentShopContext();
  if (result.ok) redirect("/customers");
  if (result.code === "NOT_AUTHENTICATED" || result.code === "SUPABASE_NOT_CONFIGURED") redirect("/login");
  if (result.code !== "NO_SHOP_MEMBERSHIP") throw new Error("Shop setup is temporarily unavailable.");
  return <><PageHeader eyebrow="Welcome to MekaReports" title="Set Up Your Repair Shop" description="Create your shop workspace to manage customers and vehicles. You'll be the shop owner." /><RecordForm kind="shop" action={createShop} cancelHref="/" submitLabel="Create Shop" /></>;
}
