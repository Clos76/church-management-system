// lib/services/registration-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  Registration,
  CreateRegistrationInput,
  UpdateRegistrationInput,
  RegistrationWithDetails,
  RegistrationWithBalance,
  PublicRegistrationInput,
} from "@/lib/types/registration";
import { ServiceResult } from "./member-service";

export class RegistrationService {
  private supabase = createClient();

  /**
   * Get all registrations with details
   */
  async getRegistrations(options?: {
    eventId?: string;
    memberId?: string;
    status?: Registration["status"];
  }): Promise<ServiceResult<RegistrationWithBalance[]>> {
    try {
      let query = this.supabase
        .from("registrations")
        .select(
          `
          *,
          members(id, first_name, last_name, email, mobile_phone, emergency_contact_name, emergency_contact_phone),
          events(id, name, event_date, price, allow_partial_payment),
          payments(id, amount, method, created_at, recorded_by)
        `,
        )
        .order("created_at", { ascending: false });

      if (options?.eventId) {
        query = query.eq("event_id", options.eventId);
      }

      if (options?.memberId) {
        query = query.eq("member_id", options.memberId);
      }

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching registrations:", error);
        return { success: false, error: error.message };
      }

      // Calculate balances
      const registrationsWithBalance: RegistrationWithBalance[] = (
        data || []
      ).map((reg: any) => {
        const eventPrice = reg.events?.price || 0;
        const payments = reg.payments || [];
        const totalPaid = payments.reduce(
          (sum: number, p: any) => sum + parseFloat(p.amount),
          0,
        );
        const balanceDue = eventPrice - totalPaid;

        let paymentStatus: "unpaid" | "partial" | "paid" | "overpaid";
        if (totalPaid === 0) {
          paymentStatus = "unpaid";
        } else if (totalPaid < eventPrice) {
          paymentStatus = "partial";
        } else if (totalPaid === eventPrice) {
          paymentStatus = "paid";
        } else {
          paymentStatus = "overpaid";
        }

        return {
          ...reg,
          total_paid: totalPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
        };
      });

      return { success: true, data: registrationsWithBalance };
    } catch (err) {
      console.error("Unexpected error fetching registrations:", err);
      return { success: false, error: "Failed to fetch registrations" };
    }
  }

  /**
   * Get a single registration by ID
   */
  async getRegistrationById(
    id: string,
  ): Promise<ServiceResult<RegistrationWithBalance>> {
    try {
      const { data, error } = await this.supabase
        .from("registrations")
        .select(
          `
          *,
          members(id, first_name, last_name, email, mobile_phone, emergency_contact_name, emergency_contact_phone),
          events(id, name, event_date, price, allow_partial_payment),
          payments(id, amount, method, created_at, recorded_by)
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching registration:", error);
        return { success: false, error: error.message };
      }

      const eventPrice = data.events?.price || 0;
      const payments = data.payments || [];
      const totalPaid = payments.reduce(
        (sum: number, p: any) => sum + parseFloat(p.amount),
        0,
      );
      const balanceDue = eventPrice - totalPaid;

      let paymentStatus: "unpaid" | "partial" | "paid" | "overpaid";
      if (totalPaid === 0) {
        paymentStatus = "unpaid";
      } else if (totalPaid < eventPrice) {
        paymentStatus = "partial";
      } else if (totalPaid === eventPrice) {
        paymentStatus = "paid";
      } else {
        paymentStatus = "overpaid";
      }

      const registrationWithBalance: RegistrationWithBalance = {
        ...data,
        total_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
      };

      return { success: true, data: registrationWithBalance };
    } catch (err) {
      console.error("Unexpected error fetching registration:", err);
      return { success: false, error: "Failed to fetch registration" };
    }
  }

  /**
   * Create a registration from public signup form
   * This handles member creation/matching automatically
   */
  async createPublicRegistration(
    input: PublicRegistrationInput,
  ): Promise<ServiceResult<{ registration: Registration; member_id: string }>> {
    try {
      // First, check if event is still accepting registrations
      const { data: event, error: eventError } = await this.supabase
        .from("events")
        .select("id, name, status, capacity, registrations(id, status)")
        .eq("id", input.event_id)
        .single();

      if (eventError || !event) {
        return { success: false, error: "Event not found" };
      }

      if (event.status !== "open") {
        return {
          success: false,
          error: "Event is not accepting registrations",
        };
      }

      // Check capacity
      if (event.capacity) {
        const confirmedCount =
          event.registrations?.filter(
            (r: any) => r.status === "confirmed" || r.status === "paid",
          ).length || 0;

        if (confirmedCount >= event.capacity) {
          return { success: false, error: "Event is at full capacity" };
        }
      }

      // Try to find existing member by email
      let memberId: string | null = null;

      if (input.email && input.email.trim()) {
        const { data: existingMember } = await this.supabase
          .from("members")
          .select("id")
          .eq("email", input.email)
          .maybeSingle();

        memberId = existingMember?.id || null;
      }

      // If no existing member found, create new one
      if (!memberId) {
        const { data: newMember, error: memberError } = await this.supabase
          .from("members")
          .insert({
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email || null,
            mobile_phone: input.mobile_phone || null,
            emergency_contact_name: input.emergency_contact_name || null,
            emergency_contact_phone: input.emergency_contact_phone || null,
            member_status: "visitor",
          })
          .select()
          .single();

        if (memberError) {
          console.error("Error creating member:", memberError);
          return { success: false, error: "Failed to create member record" };
        }

        memberId = newMember.id;
      } else {
        // Update existing member's emergency contact if provided
        await this.supabase
          .from("members")
          .update({
            emergency_contact_name: input.emergency_contact_name || null,
            emergency_contact_phone: input.emergency_contact_phone || null,
          })
          .eq("id", memberId);
      }

      // Check if member is already registered for this event
      if (!memberId) {
        return {
          success: false,
          error: "Failed to create or find member record",
        };
      }

      const { data: existingReg } = await this.supabase
        .from("registrations")
        .select("id")
        .eq("member_id", memberId)
        .eq("event_id", input.event_id)
        .maybeSingle();

      if (existingReg) {
        return {
          success: false,
          error: "You are already registered for this event",
        };
      }

      // Create registration
      const { data: registration, error: regError } = await this.supabase
        .from("registrations")
        .insert({
          member_id: memberId,
          event_id: input.event_id,
          status: "pending",
          notes: input.notes,
        })
        .select()
        .single();

      if (regError) {
        console.error("Error creating registration:", regError);
        return { success: false, error: "Failed to create registration" };
      }

      return {
        success: true,
        data: { registration, member_id: memberId },
      };
    } catch (err) {
      console.error("Unexpected error creating registration:", err);
      return { success: false, error: "Failed to create registration" };
    }
  }

  /**
   * Create a registration (admin)
   */
  async createRegistration(
    input: CreateRegistrationInput,
  ): Promise<ServiceResult<Registration>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await this.supabase
        .from("registrations")
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error("Error creating registration:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(
        user.id,
        "create",
        "registrations",
        data.id,
        null,
        data,
      );

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error creating registration:", err);
      return { success: false, error: "Failed to create registration" };
    }
  }

  /**
   * Update a registration
   */
  async updateRegistration(
    input: UpdateRegistrationInput,
  ): Promise<ServiceResult<Registration>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data: oldData } = await this.supabase
        .from("registrations")
        .select("*")
        .eq("id", input.id)
        .single();

      const { id, ...updates } = input;

      const { data, error } = await this.supabase
        .from("registrations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating registration:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(
        user.id,
        "update",
        "registrations",
        id,
        oldData,
        data,
      );

      return { success: true, data };
    } catch (err) {
      console.error("Unexpected error updating registration:", err);
      return { success: false, error: "Failed to update registration" };
    }
  }

  /**
   * Delete a registration
   */
  async deleteRegistration(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data: oldData } = await this.supabase
        .from("registrations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await this.supabase
        .from("registrations")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting registration:", error);
        return { success: false, error: error.message };
      }

      // Log the action
      await this.logAction(
        user.id,
        "delete",
        "registrations",
        id,
        oldData,
        null,
      );

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting registration:", err);
      return { success: false, error: "Failed to delete registration" };
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
export const registrationService = new RegistrationService();
