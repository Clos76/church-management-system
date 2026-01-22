// lib/services/event-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventWithStats,
  EventWithRegistrations,
  PublicEvent,
} from "@/lib/types/event";
import { ServiceResult } from "./member-service";

export class EventService {
  private supabase = createClient();

  /**
   * Get all events with optional filtering
   */
  async getEvents(options?: {
    status?: Event["status"];
    includeStats?: boolean;
  }): Promise<ServiceResult<EventWithStats[]>> {
    try {
      let query = this.supabase
        .from("events")
        .select(
          `
          *,
          registrations(id, status)
        `,
        )
        .order("event_date", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching events:", error);
        return { success: false, error: error.message };
      }

      // Calculate stats for each event
      const eventsWithStats: EventWithStats[] = (data || []).map((event) => {
        const registrations = (event.registrations || []) as Array<{
          id: string;
          status: string;
        }>;
        const confirmedCount = registrations.filter(
          (r) => r.status === "confirmed" || r.status === "paid",
        ).length;

        return {
          ...event,
          registration_count: registrations.length,
          confirmed_count: confirmedCount,
          capacity_remaining: event.capacity
            ? event.capacity - confirmedCount
            : null,
        } as EventWithStats;
      });

      return { success: true, data: eventsWithStats };
    } catch (err) {
      console.error("Unexpected error fetching events:", err);
      return { success: false, error: "Failed to fetch events" };
    }
  }

  /**
   * Get a single event by ID (admin view with full details)
   */
  async getEventById(
    id: string,
  ): Promise<ServiceResult<EventWithRegistrations>> {
    try {
      const { data, error } = await this.supabase
        .from("events")
        .select(
          `
          *,
          registrations(
            id,
            status,
            created_at,
            members(id, first_name, last_name, email)
          )
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching event:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error fetching event:", err);
      return { success: false, error: "Failed to fetch event" };
    }
  }

  /**
   * Get public event by signup URL (for registration page)
   */
  async getEventBySignupUrl(
    signupUrl: string,
  ): Promise<ServiceResult<PublicEvent>> {
    try {
      const { data, error } = await this.supabase
        .from("events")
        .select(
          `
          id,
          name,
          description,
          event_date,
          end_date,
          location,
          capacity,
          price,
          allow_partial_payment,
          status,
          registrations(id, status)
        `,
        )
        .eq("public_signup_url", signupUrl)
        .eq("status", "open")
        .single();

      if (error) {
        console.error("Error fetching public event:", error);
        return { success: false, error: "Event not found or not available" };
      }

      const registrations = data.registrations || [];
      const confirmedCount = registrations.filter(
        (r: any) => r.status === "confirmed" || r.status === "paid",
      ).length;

      const publicEvent: PublicEvent = {
        id: data.id,
        name: data.name,
        description: data.description,
        event_date: data.event_date,
        end_date: data.end_date,
        location: data.location,
        capacity: data.capacity,
        price: data.price,
        allow_partial_payment: data.allow_partial_payment,
        status: data.status,
        registration_count: registrations.length,
        capacity_remaining: data.capacity
          ? data.capacity - confirmedCount
          : null,
      };

      return { success: true, data: publicEvent };
    } catch (err) {
      console.error("Unexpected error fetching public event:", err);
      return { success: false, error: "Failed to fetch event" };
    }
  }

  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput): Promise<ServiceResult<Event>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Validate required fields
      if (!input.name || !input.event_date) {
        return {
          success: false,
          error: "Event name and date are required",
        };
      }

      const { data, error } = await this.supabase
        .from("events")
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating event:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "create", "events", data.id, null, data);

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error creating event:", err);
      return { success: false, error: "Failed to create event" };
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(input: UpdateEventInput): Promise<ServiceResult<Event>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get old data for audit log
      const { data: oldData } = await this.supabase
        .from("events")
        .select("*")
        .eq("id", input.id)
        .single();

      const { id, ...updates } = input;

      const { data, error } = await this.supabase
        .from("events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating event:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "update", "events", id, oldData, data);

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error updating event:", err);
      return { success: false, error: "Failed to update event" };
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Check if event has registrations
      const { count } = await this.supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id);

      if (count && count > 0) {
        return {
          success: false,
          error: "Cannot delete event with existing registrations",
        };
      }

      // Get data for audit log
      const { data: oldData } = await this.supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await this.supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting event:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "delete", "events", id, oldData, null);

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting event:", err);
      return { success: false, error: "Failed to delete event" };
    }
  }

  /**
   * Get the public signup URL for an event
   */
  getSignupUrl(event: Event): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/register/${event.public_signup_url}`;
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
export const eventService = new EventService();
