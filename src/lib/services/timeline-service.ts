import { createClient } from "@/lib/supabase/client";
import type { ServiceResult, PaginatedResult } from "./types";

export type ActivityEventType =
  | "member.created"
  | "member.updated"
  | "event.registered"
  | "event.attended"
  | "donation.completed"
  | "task.created"
  | "task.completed"
  | "note.added"
  | "tag.assigned"
  | "tag.removed"
  | "group.joined"
  | "group.left"
  | "email.sent";

export interface ActivityEntry {
  id: string;
  profile_id: string;
  actor_id: string | null;
  event_type: ActivityEventType | string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AddEntryInput {
  profile_id: string;
  actor_id?: string;
  event_type: ActivityEventType | string;
  metadata?: Record<string, unknown>;
}

export class TimelineService {
  private supabase = createClient();

  /** @internal Called only by src/lib/events/setup.ts — emit a DomainEvent instead of calling this directly. */
  async addEntry(input: AddEntryInput): Promise<void> {
    try {
      await this.supabase.from("activity_logs").insert({
        profile_id: input.profile_id,
        actor_id: input.actor_id ?? null,
        event_type: input.event_type,
        metadata: input.metadata ?? {},
      });
    } catch (err) {
      console.error("Failed to add timeline entry:", err);
    }
  }

  async getTimeline(
    profileId: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<ServiceResult<PaginatedResult<ActivityEntry>>> {
    try {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await this.supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching timeline:", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          items: (data || []) as ActivityEntry[],
          total: count ?? 0,
          page,
          pageSize,
        },
      };
    } catch (err) {
      console.error("Unexpected error fetching timeline:", err);
      return { success: false, error: "Failed to fetch timeline" };
    }
  }
}

export const timelineService = new TimelineService();
