// lib/services/member-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
} from "@/lib/types/member";
import { Database } from "../types/database.types";
import { eventBus } from "@/lib/events/event-bus";

export type { ServiceResult, PaginatedResult } from "./types";
import type { ServiceResult, PaginatedResult } from "./types";

export class MemberService {
  private supabase = createClient();

  /**
   * Get members with optional search and pagination
   */
  async getMembers(options?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ServiceResult<PaginatedResult<Member>>> {
    try {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.supabase
        .from("members")
        .select("*", { count: "exact" })
        .order("last_name", { ascending: true })
        .range(from, to);

      if (options?.search && options.search.trim()) {
        const search = `%${options.search.trim()}%`;
        query = query.or(
          `first_name.ilike.${search},last_name.ilike.${search},email.ilike.${search},mobile_phone.ilike.${search}`,
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching members:", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: { items: data || [], total: count ?? 0, page, pageSize },
      };
    } catch (err) {
      console.error("Unexpected error fetching members:", err);
      return { success: false, error: "Failed to fetch members" };
    }
  }

  /**
   * Get a single member by ID
   */
  async getMemberById(id: string): Promise<ServiceResult<Member>> {
    try {
      const { data, error } = await this.supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error fetching member:", err);
      return { success: false, error: "Failed to fetch member" };
    }
  }

  /**
   * Create a new member
   */
  async createMember(input: CreateMemberInput): Promise<ServiceResult<Member>> {
    try {
      // Get current user for audit log
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Validate required fields
      if (!input.first_name || !input.last_name) {
        return {
          success: false,
          error: "First name and last name are required",
        };
      }

      // Prepare insert data with proper typing
      const insertData: Database["public"]["Tables"]["members"]["Insert"] = {
        member_status: input.member_status || "visitor",
        // Include any other fields from input
        ...input,
      };

      const { data, error } = await this.supabase
        .from("members")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating member:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "create", "members", data.id, null, data);

      eventBus.emit({ type: "member.created", profileId: data.id, status: data.member_status });

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error creating member:", err);
      return { success: false, error: "Failed to create member" };
    }
  }

  /**
   * Update an existing member
   */
  async updateMember(input: UpdateMemberInput): Promise<ServiceResult<Member>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get old data for audit log
      const { data: oldData } = await this.supabase
        .from("members")
        .select("*")
        .eq("id", input.id)
        .single();

      const { id, ...updates } = input;

      // Type the update data properly
      const updateData: Database["public"]["Tables"]["members"]["Update"] =
        updates;

      const { data, error } = await this.supabase
        .from("members")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating member:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "update", "members", id, oldData, data);

      if (input.member_status && oldData?.member_status !== input.member_status) {
        eventBus.emit({
          type: "member.statusChanged",
          profileId: id,
          from: oldData?.member_status ?? "",
          to: input.member_status,
        });
      }

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error updating member:", err);
      return { success: false, error: "Failed to update member" };
    }
  }

  /**
   * Delete a member
   */
  async deleteMember(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get data for audit log before deletion
      const { data: oldData } = await this.supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await this.supabase
        .from("members")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting member:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(user.id, "delete", "members", id, oldData, null);

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting member:", err);
      return { success: false, error: "Failed to delete member" };
    }
  }

  /**
   * Export members to CSV
   */
  async exportToCSV(members: Member[]): Promise<ServiceResult<string>> {
    try {
      const headers = [
        "First Name",
        "Last Name",
        "Email",
        "Mobile Phone",
        "Member Status",
        "Emergency Contact",
        "Emergency Phone",
      ];

      const rows = members.map((m) => [
        m.first_name,
        m.last_name,
        m.email || "",
        m.mobile_phone || "",
        m.member_status,
        m.emergency_contact_name || "",
        m.emergency_contact_phone || "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return { success: true, data: csv };
    } catch (err) {
      console.error("Error exporting CSV:", err);
      return { success: false, error: "Failed to export CSV" };
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
      // Don't fail the main operation if logging fails
      console.error("Failed to log action:", err);
    }
  }
}

// Export singleton instance
export const memberService = new MemberService();
