import { createClient } from "@/lib/supabase/client";
import { ServiceResult } from "./member-service";

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

export interface AssignableUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

export class UserService {
  private supabase = createClient();

  async getUsers(): Promise<ServiceResult<UserProfile[]>> {
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error("Unexpected error fetching users:", err);
      return { success: false, error: "Failed to fetch users" };
    }
  }

  async updateUserRole(
    userId: string,
    newRole: string,
  ): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user: currentUser },
      } = await this.supabase.auth.getUser();

      if (!currentUser) {
        return {
          success: false,
          error: "You must be logged in to update roles",
        };
      }

      const { data: targetUser } = await this.supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const oldRole = targetUser?.role;

      const { error: updateError } = await this.supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating role:", updateError);
        return { success: false, error: updateError.message };
      }

      await this.supabase.from("audit_logs").insert({
        user_id: currentUser.id,
        action: "update",
        table_name: "profiles",
        record_id: userId,
        description: `Changed user role from ${oldRole} to ${newRole}`,
      });

      return { success: true };
    } catch (err) {
      console.error("Unexpected error updating user role:", err);
      return { success: false, error: "Failed to update user role" };
    }
  }

  async getAssignableUsers(): Promise<ServiceResult<AssignableUser[]>> {
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, role");

      if (error) {
        console.error("Error fetching assignable users:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error("Unexpected error fetching assignable users:", err);
      return { success: false, error: "Failed to fetch users" };
    }
  }
}

export const userService = new UserService();
