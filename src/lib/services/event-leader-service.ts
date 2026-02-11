// lib/services/event-leader-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  EventLeader,
  EventLeaderWithProfile,
  EventLeaderWithEvent,
  AssignEventLeaderInput,
  UpdateEventLeaderPermissionsInput,
  EventLeaderPermissions,
  DEFAULT_LEADER_PERMISSIONS,
  LeaderDashboardStats,
} from "@/lib/types/event-leader";
import { ServiceResult } from "./member-service";

export class EventLeaderService {
  private supabase = createClient();

  /**
   * Assign a leader to an event
   */
  async assignLeader(
    input: AssignEventLeaderInput,
  ): Promise<ServiceResult<EventLeader>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Check if user is admin
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return { success: false, error: "Only admins can assign leaders" };
      }

      // Merge custom permissions with defaults
      const permissions: EventLeaderPermissions = {
        ...DEFAULT_LEADER_PERMISSIONS,
        ...input.permissions,
      };

      // Check if leader assignment already exists
      const { data: existing } = await this.supabase
        .from("event_leaders")
        .select("id")
        .eq("event_id", input.event_id)
        .eq("user_id", input.user_id)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: "This user is already a leader for this event",
        };
      }

      // Create event leader assignment
      const { data, error } = await this.supabase
        .from("event_leaders")
        .insert({
          event_id: input.event_id,
          user_id: input.user_id,
          assigned_by: user.id,
          permissions: permissions as any,
        })
        .select()
        .single();

      if (error) {
        console.error("Error assigning leader:", error);
        return { success: false, error: error.message };
      }

      // Update the user's role to event_leader if not already
      await this.supabase
        .from("profiles")
        .update({ role: "event_leader" })
        .eq("id", input.user_id);

      // Log the action
      await this.logAction(
        user.id,
        "assign_leader",
        "event_leaders",
        data.id,
        null,
        data,
      );

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error assigning leader:", err);
      return { success: false, error: "Failed to assign leader" };
    }
  }

  /**
   * Remove a leader from an event
   */
  async removeLeader(eventLeaderId: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get data for audit log
      const { data: oldData } = await this.supabase
        .from("event_leaders")
        .select("*")
        .eq("id", eventLeaderId)
        .single();

      const { error } = await this.supabase
        .from("event_leaders")
        .delete()
        .eq("id", eventLeaderId);

      if (error) {
        console.error("Error removing leader:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(
        user.id,
        "remove_leader",
        "event_leaders",
        eventLeaderId,
        oldData,
        null,
      );

      return { success: true };
    } catch (err) {
      console.error("Unexpected error removing leader:", err);
      return { success: false, error: "Failed to remove leader" };
    }
  }

  /**
   * Get all leaders for a specific event
   */
  async getEventLeaders(
    eventId: string,
  ): Promise<ServiceResult<EventLeaderWithProfile[]>> {
    try {
      const { data, error } = await this.supabase
        .from("event_leaders")
        .select("*")
        .eq("event_id", eventId);

      if (error) {
        console.error("Error fetching event leaders:", error);
        return { success: false, error: error.message };
      }

      // Manually fetch profile data for each leader
      const leadersWithProfiles = await Promise.all(
        (data || []).map(async (leader) => {
          const { data: profile } = await this.supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url")
            .eq("id", leader.user_id)
            .single();

          // NOTE: Email won't be available unless you store it in profiles table
          // Or create a server-side API route that uses service role
          return {
            ...leader,
            profiles: {
              ...(profile || {
                id: leader.user_id,
                first_name: null,
                last_name: null,
                avatar_url: null,
              }),
              email: null, // Can't get email from client-side without admin access
            },
          } as EventLeaderWithProfile;
        }),
      );

      return { success: true, data: leadersWithProfiles };
    } catch (err) {
      console.error("Unexpected error fetching event leaders:", err);
      return { success: false, error: "Failed to fetch event leaders" };
    }
  }

  /**
   * Get all events a user is leading
   */
  async getLeaderEvents(
    userId?: string,
  ): Promise<ServiceResult<EventLeaderWithEvent[]>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const targetUserId = userId || user.id;

      const { data, error } = await this.supabase
        .from("event_leaders")
        .select(
          `
          *,
          events (
            id,
            name,
            event_date,
            status,
            location
          )
        `,
        )
        .eq("user_id", targetUserId)
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("Error fetching leader events:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as EventLeaderWithEvent[] };
    } catch (err) {
      console.error("Unexpected error fetching leader events:", err);
      return { success: false, error: "Failed to fetch leader events" };
    }
  }

  /**
   * Update leader permissions for an event
   */
  async updatePermissions(
    input: UpdateEventLeaderPermissionsInput,
  ): Promise<ServiceResult<EventLeader>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get current data
      const { data: current } = await this.supabase
        .from("event_leaders")
        .select("*")
        .eq("id", input.event_leader_id)
        .single();

      if (!current) {
        return { success: false, error: "Event leader not found" };
      }

      // Merge permissions
      const updatedPermissions = {
        ...(current.permissions as EventLeaderPermissions),
        ...input.permissions,
      };

      const { data, error } = await this.supabase
        .from("event_leaders")
        .update({ permissions: updatedPermissions as any })
        .eq("id", input.event_leader_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating permissions:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(
        user.id,
        "update_leader_permissions",
        "event_leaders",
        input.event_leader_id,
        current,
        data,
      );

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error updating permissions:", err);
      return { success: false, error: "Failed to update permissions" };
    }
  }

  /**
   * Check if current user is a leader for a specific event
   */
  async isEventLeader(eventId: string): Promise<ServiceResult<boolean>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: true, data: false };
      }

      const { data } = await this.supabase
        .from("event_leaders")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      return { success: true, data: !!data };
    } catch (err) {
      console.error("Error checking leader status:", err);
      return { success: false, error: "Failed to check leader status" };
    }
  }

  /**
   * Get leader's permissions for a specific event
   */
  async getLeaderPermissions(
    eventId: string,
  ): Promise<ServiceResult<EventLeaderPermissions | null>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: true, data: null };
      }

      const { data } = await this.supabase
        .from("event_leaders")
        .select("permissions")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        success: true,
        data: data?.permissions as EventLeaderPermissions | null,
      };
    } catch (err) {
      console.error("Error fetching permissions:", err);
      return { success: false, error: "Failed to fetch permissions" };
    }
  }

  /**
   * Get dashboard stats for a leader
   */
  async getLeaderDashboardStats(): Promise<
    ServiceResult<LeaderDashboardStats>
  > {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get all events user is leading
      const { data: leaderEvents } = await this.supabase
        .from("event_leaders")
        .select("event_id")
        .eq("user_id", user.id);

      if (!leaderEvents || leaderEvents.length === 0) {
        return {
          success: true,
          data: {
            total_events: 0,
            active_events: 0,
            total_registrations: 0,
            pending_payments: 0,
          },
        };
      }

      const eventIds = leaderEvents.map((le) => le.event_id);

      // Get event stats
      const { data: events } = await this.supabase
        .from("events")
        .select("id, status")
        .in("id", eventIds);

      const activeEvents =
        events?.filter((e) => e.status === "open").length || 0;

      // Get registration count
      const { count: registrationCount } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);

      // Get pending payments
      const { data: registrations } = await this.supabase
        .from("registrations")
        .select(
          `
          id,
          event_id,
          events!inner(price),
          payments(amount)
        `,
        )
        .in("event_id", eventIds)
        .in("status", ["pending", "partial"]);

      let pendingCount = 0;
      registrations?.forEach((reg: any) => {
        const eventPrice = reg.events?.price || 0;
        const totalPaid =
          reg.payments?.reduce(
            (sum: number, p: any) => sum + parseFloat(p.amount),
            0,
          ) || 0;
        if (eventPrice > totalPaid) {
          pendingCount++;
        }
      });

      return {
        success: true,
        data: {
          total_events: eventIds.length,
          active_events: activeEvents,
          total_registrations: registrationCount || 0,
          pending_payments: pendingCount,
        },
      };
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      return { success: false, error: "Failed to fetch dashboard stats" };
    }
  }

  /**
   * Private helper to log admin actions
   */
  private async logAction(
    userId: string,
    action: string,
    tableName: string,
    recordId: string,
    oldData: any,
    newData: any,
  ) {
    try {
      await this.supabase.from("audit_logs").insert({
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: newData,
      });
    } catch (err) {
      console.error("Failed to log action:", err);
    }
  }
}

// Export singleton instance
export const eventLeaderService = new EventLeaderService();
