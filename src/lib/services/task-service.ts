import { createClient } from "@/lib/supabase/client";
import type { ServiceResult, PaginatedResult } from "./types";
import { eventBus } from "@/lib/events/event-bus";

export type TaskStatus = "pending" | "in_progress" | "completed" | "snoozed";

export interface Task {
  id: string;
  profile_id: string;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  profile_id: string;
  assigned_to?: string;
  title: string;
  description?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: TaskStatus;
  assigned_to?: string;
}

export class TaskService {
  private supabase = createClient();

  async createTask(input: CreateTaskInput): Promise<ServiceResult<Task>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) return { success: false, error: "Not authenticated" };

      const { data, error } = await this.supabase
        .from("tasks")
        .insert({
          profile_id: input.profile_id,
          assigned_to: input.assigned_to ?? null,
          created_by: user.id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.due_date ?? null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return { success: false, error: error.message };
      }

      eventBus.emit({
        type: "task.created",
        profileId: input.profile_id,
        taskId: data.id,
        actorId: user.id,
      });

      return { success: true, data: data as Task };
    } catch (err) {
      console.error("Unexpected error creating task:", err);
      return { success: false, error: "Failed to create task" };
    }
  }

  async getTasks(options?: {
    assignedTo?: string;
    profileId?: string;
    status?: TaskStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ServiceResult<PaginatedResult<Task>>> {
    try {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .order("due_date", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (options?.assignedTo) {
        query = query.eq("assigned_to", options.assignedTo);
      }
      if (options?.profileId) {
        query = query.eq("profile_id", options.profileId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching tasks:", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          items: (data || []) as Task[],
          total: count ?? 0,
          page,
          pageSize,
        },
      };
    } catch (err) {
      console.error("Unexpected error fetching tasks:", err);
      return { success: false, error: "Failed to fetch tasks" };
    }
  }

  async updateTask(input: UpdateTaskInput): Promise<ServiceResult<Task>> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await this.supabase
        .from("tasks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating task:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Task };
    } catch (err) {
      console.error("Unexpected error updating task:", err);
      return { success: false, error: "Failed to update task" };
    }
  }

  async completeTask(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) return { success: false, error: "Not authenticated" };

      const { data: task } = await this.supabase
        .from("tasks")
        .select("profile_id")
        .eq("id", id)
        .single();

      const { error } = await this.supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error completing task:", error);
        return { success: false, error: error.message };
      }

      if (task?.profile_id) {
        eventBus.emit({
          type: "task.completed",
          profileId: task.profile_id,
          taskId: id,
          actorId: user.id,
        });
      }

      return { success: true };
    } catch (err) {
      console.error("Unexpected error completing task:", err);
      return { success: false, error: "Failed to complete task" };
    }
  }

  async deleteTask(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.from("tasks").delete().eq("id", id);

      if (error) {
        console.error("Error deleting task:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting task:", err);
      return { success: false, error: "Failed to delete task" };
    }
  }
}

export const taskService = new TaskService();
