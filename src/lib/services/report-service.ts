import { createClient } from "@/lib/supabase/client";
import type { ServiceResult } from "./types";

export interface UpcomingEvent {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

export interface RecentRegistration {
  id: string;
  created_at: string;
  status: string;
  members: { first_name: string | null; last_name: string | null } | null;
  events: { name: string | null } | null;
}

export interface DashboardStats {
  totalMembers: number;
  totalEvents: number;
  activeRegistrations: number;
  pendingPayments: number;
  upcomingEvents: UpcomingEvent[];
  recentRegistrations: RecentRegistration[];
}

export class ReportService {
  private supabase = createClient();

  async getDashboardStats(): Promise<ServiceResult<DashboardStats>> {
    try {
      const [
        membersRes,
        eventsRes,
        registrationsRes,
        pendingRegsRes,
        upcomingEventsRes,
        recentRegsRes,
      ] = await Promise.all([
        this.supabase
          .from("members")
          .select("*", { count: "exact", head: true }),
        this.supabase
          .from("events")
          .select("*", { count: "exact", head: true }),
        this.supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "confirmed", "partial"]),
        this.supabase
          .from("registrations")
          .select("id, event_id, events(price), payments(amount)")
          .in("status", ["pending", "partial"]),
        this.supabase
          .from("events")
          .select("id, name, event_date, status")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(5),
        this.supabase
          .from("registrations")
          .select(
            "id, created_at, status, members(first_name, last_name), events(name)",
          )
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
        success: true,
        data: {
          totalMembers: membersRes.count || 0,
          totalEvents: eventsRes.count || 0,
          activeRegistrations: registrationsRes.count || 0,
          pendingPayments: pendingPaymentsCount,
          upcomingEvents: (upcomingEventsRes.data as UpcomingEvent[]) || [],
          recentRegistrations:
            (recentRegsRes.data as unknown as RecentRegistration[]) || [],
        },
      };
    } catch (err) {
      console.error("Unexpected error fetching dashboard stats:", err);
      return { success: false, error: "Failed to load dashboard data" };
    }
  }
}

export const reportService = new ReportService();
