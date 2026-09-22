import Link from "next/link";
import { requireShopContext } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out";
import { PageHeader } from "@/components/page-header";
import { Details, panel, secondaryLink } from "@/components/workshop/record-ui";

export default async function SettingsPage() {
  const {shop,user,role}=await requireShopContext();
  const accountEmail = user.email ?? null;
  return <div className="max-w-4xl space-y-6"><Link href="/" className={secondaryLink}>← Dashboard</Link><PageHeader eyebrow="Local Development" title="Shop & Account" description="Your current workspace and beta service availability."/><section className={panel}><h2 className="mb-4 text-xl font-bold">{shop.name}</h2><Details entries={[["Account",accountEmail],["Role",role.replaceAll("_"," ")],["Shop email",shop.email],["Shop phone",shop.phone],["Address",[shop.address,shop.city,shop.state,shop.postalCode].filter(Boolean).join(", ")]]}/><div className="mt-5"><SignOutButton/></div></section><section className={`${panel} space-y-3`}><h2 className="text-xl font-bold">Beta service status</h2><p>Shop records and private documents use the local MekaReports database.</p><p>Email is captured in the local Mailpit inbox. It is not sent to internet recipients.</p><p>SMS provider not configured. Text previews stay unsent drafts.</p><p>Reminders are sent manually. Automated scheduling, production services, team administration, and mobile app packaging are deferred.</p><div className="flex flex-wrap gap-3"><Link className={secondaryLink} href="/feedback?path=/settings">Send Beta Feedback</Link><Link className={secondaryLink} href="/service-reminders">Service Reminders</Link></div></section></div>;
}
