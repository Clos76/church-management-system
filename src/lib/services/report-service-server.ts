import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardStats, UpcomingEvent, RecentRegistration } from "./report-service";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();

  const [
    membersRes,
    eventsRes,
    registrationsRes,
    pendingRegsRes,
    upcomingEventsRes,
    recentRegsRes,
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "confirmed", "partial"]),
    supabase
      .from("registrations")
      .select("id, member_id, event_id, events(price), payments(amount)")
      .in("status", ["pending", "partial"])
      .limit(500),
    supabase
      .from("events")
      .select("id, name, event_date, status")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(5),
    supabase
      .from("registrations")
      .select("id, created_at, status, members(first_name, last_name), events(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  let pendingPaymentsCount = 0;
  pendingRegsRes.data?.forEach((reg: any) => {
    const eventPrice = reg.events?.price || 0;
    const totalPaid =
      reg.payments?.reduce(
        (sum: number, p: any) => sum + parseFloat(p.amount),
        0,
      ) || 0;
    if (eventPrice > totalPaid) {
      pendingPaymentsCount++;
    }
  });

  return {
    totalMembers: membersRes.count || 0,
    totalEvents: eventsRes.count || 0,
    activeRegistrations: registrationsRes.count || 0,
    pendingPayments: pendingPaymentsCount,
    upcomingEvents: (upcomingEventsRes.data as UpcomingEvent[]) || [],
    recentRegistrations: (recentRegsRes.data as unknown as RecentRegistration[]) || [],
  };
}

// Cache for 1 hour — revalidated on next request after TTL expires
export const getCachedDashboardStats = unstable_cache(
  fetchDashboardStats,
  ["dashboard-stats"],
  { revalidate: 3600 },
);
