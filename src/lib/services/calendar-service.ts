// lib/services/calendar-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  CreateCalendarInput,
  UpdateCalendarInput,
  CalendarWithStats,
} from "@/lib/types/calendar";
import { ServiceResult } from "./member-service";

export class CalendarService {
  private supabase = createClient();

  /**
   * Get all calendars with optional stats
   */
  async getCalendars(options?: {
    includeStats?: boolean;
  }): Promise<ServiceResult<CalendarWithStats[]>> {
    try {
      if (options?.includeStats) {
        // Get calendars with event counts using separate queries
        const { data: calendars, error: calError } = await this.supabase
          .from("calendars")
          .select("*")
          .order("display_order", { ascending: true });

        if (calError) {
          console.error("Error fetching calendars:", calError);
          return { success: false, error: calError.message };
        }

        // Get event counts for each calendar
        const calendarsWithStats: CalendarWithStats[] = await Promise.all(
          (calendars || []).map(async (calendar) => {
            const { data: events } = await this.supabase
              .from("events")
              .select("id, status, event_date")
              .eq("calendar_id", calendar.id);

            const now = new Date();
            const eventList = events || [];
            const upcomingEvents = eventList.filter(
              (e) =>
                (e.status === "open" || e.status === "draft") &&
                new Date(e.event_date) >= now,
            );

            return {
              ...calendar,
              event_count: eventList.length,
              upcoming_event_count: upcomingEvents.length,
            };
          }),
        );

        return { success: true, data: calendarsWithStats };
      } else {
        // Simple query without stats
        const { data, error } = await this.supabase
          .from("calendars")
          .select("*")
          .order("display_order", { ascending: true });

        if (error) {
          console.error("Error fetching calendars:", error);
          return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
      }
    } catch (err) {
      console.error("Unexpected error fetching calendars:", err);
      return { success: false, error: "Failed to fetch calendars" };
    }
  }

  /**
   * Get public calendars only
   */
  async getPublicCalendars(): Promise<ServiceResult<Calendar[]>> {
    try {
      const { data, error } = await this.supabase
        .from("calendars")
        .select("*")
        .eq("is_public", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching public calendars:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error("Unexpected error fetching public calendars:", err);
      return { success: false, error: "Failed to fetch public calendars" };
    }
  }

  /**
   * Get a single calendar by ID
   */
  async getCalendarById(id: string): Promise<ServiceResult<Calendar>> {
    try {
      const { data, error } = await this.supabase
        .from("calendars")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching calendar:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error fetching calendar:", err);
      return { success: false, error: "Failed to fetch calendar" };
    }
  }

  /**
   * Create a new calendar
   */
  async createCalendar(
    input: CreateCalendarInput,
  ): Promise<ServiceResult<Calendar>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Validate required fields
      if (!input.name || !input.name.trim()) {
        return { success: false, error: "Calendar name is required" };
      }

      const { data, error } = await this.supabase
        .from("calendars")
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error("Error creating calendar:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "create", "calendars", data.id, null, data);

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error creating calendar:", err);
      return { success: false, error: "Failed to create calendar" };
    }
  }

  /**
   * Update a calendar
   */
  async updateCalendar(
    input: UpdateCalendarInput,
  ): Promise<ServiceResult<Calendar>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get old data for audit log
      const { data: oldData } = await this.supabase
        .from("calendars")
        .select("*")
        .eq("id", input.id)
        .single();

      const { id, ...updates } = input;

      const { data, error } = await this.supabase
        .from("calendars")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating calendar:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "update", "calendars", id, oldData, data);

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error updating calendar:", err);
      return { success: false, error: "Failed to update calendar" };
    }
  }

  /**
   * Delete a calendar
   */
  async deleteCalendar(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Check if calendar has events
      const { count } = await this.supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("calendar_id", id);

      if (count && count > 0) {
        return {
          success: false,
          error: `Cannot delete calendar with ${count} existing events. Please reassign or delete the events first.`,
        };
      }

      // Get data for audit log
      const { data: oldData } = await this.supabase
        .from("calendars")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await this.supabase
        .from("calendars")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting calendar:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "delete", "calendars", id, oldData, null);

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting calendar:", err);
      return { success: false, error: "Failed to delete calendar" };
    }
  }

  /**
   * Reorder calendars
   */
  async reorderCalendars(calendarIds: string[]): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Update display_order for each calendar
      const updates = calendarIds.map((id, index) =>
        this.supabase
          .from("calendars")
          .update({ display_order: index })
          .eq("id", id),
      );

      await Promise.all(updates);

      return { success: true };
    } catch (err) {
      console.error("Unexpected error reordering calendars:", err);
      return { success: false, error: "Failed to reorder calendars" };
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
export const calendarService = new CalendarService();
