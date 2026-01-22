// lib/services/payment-service.ts

import { createClient } from "@/lib/supabase/client";
import {
  Payment,
  CreatePaymentInput,
  PaymentWithDetails,
  ManualPaymentInput,
} from "@/lib/types/payment";
import { ServiceResult } from "./member-service";

export class PaymentService {
  private supabase = createClient();

  /**
   * Get all payments with details
   */
  async getPayments(options?: {
    registrationId?: string;
    eventId?: string;
  }): Promise<ServiceResult<PaymentWithDetails[]>> {
    try {
      let query = this.supabase
        .from("payments")
        .select(
          `
          *,
          registrations(
            id,
            member_id,
            event_id,
            members(first_name, last_name, email),
            events(name, event_date, price)
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (options?.registrationId) {
        query = query.eq("registration_id", options.registrationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching payments:", error);
        return { success: false, error: error.message };
      }

      // If filtering by event, do it client-side since it's a nested field
      let filteredData = data || [];
      if (options?.eventId) {
        filteredData = filteredData.filter(
          (p: any) => p.registrations?.event_id === options.eventId,
        );
      }

      return { success: true, data: filteredData as PaymentWithDetails[] };
    } catch (err) {
      console.error("Unexpected error fetching payments:", err);
      return { success: false, error: "Failed to fetch payments" };
    }
  }

  /**
   * Get payments for a specific registration
   */
  async getPaymentsByRegistration(
    registrationId: string,
  ): Promise<ServiceResult<Payment[]>> {
    try {
      const { data, error } = await this.supabase
        .from("payments")
        .select("*")
        .eq("registration_id", registrationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching payments:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error("Unexpected error fetching payments:", err);
      return { success: false, error: "Failed to fetch payments" };
    }
  }

  /**
   * Record a manual payment (admin only)
   */
  async recordManualPayment(
    input: ManualPaymentInput,
  ): Promise<ServiceResult<Payment>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Validate amount
      if (input.amount <= 0) {
        return {
          success: false,
          error: "Payment amount must be greater than 0",
        };
      }

      // Get registration to validate and calculate balance
      const { data: registration, error: regError } = await this.supabase
        .from("registrations")
        .select(
          `
          *,
          events(price),
          payments(amount)
        `,
        )
        .eq("id", input.registration_id)
        .single();

      if (regError || !registration) {
        return { success: false, error: "Registration not found" };
      }

      // Calculate current balance with proper type handling
      const eventData = registration.events as any;
      const eventPrice = eventData?.price || 0;
      const paymentsData = registration.payments as any[];
      const totalPaid =
        paymentsData?.reduce(
          (sum: number, p: any) => sum + parseFloat(p.amount),
          0,
        ) || 0;
      const balanceDue = eventPrice - totalPaid;

      // Warning if overpayment (but allow it)
      if (input.amount > balanceDue) {
        console.warn(
          `Payment of $${input.amount} exceeds balance due of $${balanceDue}`,
        );
      }

      // Create payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from("payments")
        .insert({
          registration_id: input.registration_id,
          amount: input.amount,
          method: input.method,
          transaction_id: input.transaction_id,
          notes: input.notes,
          recorded_by: user.id,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        return { success: false, error: paymentError.message };
      }

      // Update registration status based on new balance
      const newTotalPaid = totalPaid + input.amount;
      let newStatus: "pending" | "partial" | "paid" = "pending";

      if (newTotalPaid >= eventPrice) {
        newStatus = "paid";
      } else if (newTotalPaid > 0) {
        newStatus = "partial";
      }

      await this.supabase
        .from("registrations")
        .update({ status: newStatus })
        .eq("id", input.registration_id);

      // Log the action
      await this.logAction(
        user.id,
        "create",
        "payments",
        payment.id,
        null,
        payment,
      );

      return { success: true, data: payment };
    } catch (err) {
      console.error("Unexpected error recording payment:", err);
      return { success: false, error: "Failed to record payment" };
    }
  }

  /**
   * Process a Stripe webhook payment
   * This is called by the Stripe webhook handler
   */
  async processStripePayment(
    registrationId: string,
    paymentIntentId: string,
    amount: number,
  ): Promise<ServiceResult<Payment>> {
    try {
      // Check if payment already exists (idempotency)
      const { data: existing } = await this.supabase
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (existing) {
        console.log(`Payment already processed for intent ${paymentIntentId}`);
        return {
          success: false,
          error: "Payment already processed",
        };
      }

      // Get registration
      const { data: registration, error: regError } = await this.supabase
        .from("registrations")
        .select(
          `
          *,
          events(price),
          payments(amount)
        `,
        )
        .eq("id", registrationId)
        .single();

      if (regError || !registration) {
        return { success: false, error: "Registration not found" };
      }

      // Create payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from("payments")
        .insert({
          registration_id: registrationId,
          amount,
          method: "stripe",
          stripe_payment_intent_id: paymentIntentId,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating Stripe payment:", paymentError);
        return { success: false, error: paymentError.message };
      }

      // Calculate new balance and update registration status with proper type handling
      const eventData = registration.events as any;
      const eventPrice = eventData?.price || 0;
      const paymentsData = registration.payments as any[];
      const totalPaid =
        (paymentsData?.reduce(
          (sum: number, p: any) => sum + parseFloat(p.amount),
          0,
        ) || 0) + amount;

      let newStatus: "pending" | "partial" | "paid" = "pending";
      if (totalPaid >= eventPrice) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial";
      }

      await this.supabase
        .from("registrations")
        .update({ status: newStatus })
        .eq("id", registrationId);

      return { success: true, data: payment };
    } catch (err) {
      console.error("Unexpected error processing Stripe payment:", err);
      return { success: false, error: "Failed to process Stripe payment" };
    }
  }

  /**
   * Calculate total paid and balance for a registration
   */
  async getRegistrationBalance(registrationId: string): Promise<
    ServiceResult<{
      event_price: number;
      total_paid: number;
      balance_due: number;
      payment_count: number;
    }>
  > {
    try {
      const { data: registration, error } = await this.supabase
        .from("registrations")
        .select(
          `
          events(price),
          payments(amount)
        `,
        )
        .eq("id", registrationId)
        .single();

      if (error || !registration) {
        return { success: false, error: "Registration not found" };
      }

      const eventData = registration.events as any;
      const eventPrice = eventData?.price || 0;
      const paymentsData = registration.payments as any[];
      const payments = paymentsData || [];
      const totalPaid = payments.reduce(
        (sum: number, p: any) => sum + parseFloat(p.amount),
        0,
      );
      const balanceDue = eventPrice - totalPaid;

      return {
        success: true,
        data: {
          event_price: eventPrice,
          total_paid: totalPaid,
          balance_due: balanceDue,
          payment_count: payments.length,
        },
      };
    } catch (err) {
      console.error("Unexpected error calculating balance:", err);
      return { success: false, error: "Failed to calculate balance" };
    }
  }

  /**
   * Delete a payment (admin only, not for Stripe payments)
   */
  async deletePayment(id: string): Promise<ServiceResult<void>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Get payment to check if it's a Stripe payment
      const { data: payment } = await this.supabase
        .from("payments")
        .select("*, registrations(id, events(price), payments(amount))")
        .eq("id", id)
        .single();

      if (!payment) {
        return { success: false, error: "Payment not found" };
      }

      if (payment.stripe_payment_intent_id) {
        return {
          success: false,
          error:
            "Cannot delete Stripe payments. Refund through Stripe instead.",
        };
      }

      const registrationId = payment.registration_id;

      // Delete the payment
      const { error } = await this.supabase
        .from("payments")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting payment:", error);
        return { success: false, error: error.message };
      }

      // Recalculate registration status
      const { data: registration } = await this.supabase
        .from("registrations")
        .select(
          `
          events(price),
          payments(amount)
        `,
        )
        .eq("id", registrationId)
        .single();

      if (registration) {
        const eventData = registration.events as any;
        const eventPrice = eventData?.price || 0;
        const paymentsData = registration.payments as any[];
        const totalPaid =
          paymentsData?.reduce(
            (sum: number, p: any) => sum + parseFloat(p.amount),
            0,
          ) || 0;

        let newStatus: "pending" | "partial" | "paid" = "pending";
        if (totalPaid >= eventPrice) {
          newStatus = "paid";
        } else if (totalPaid > 0) {
          newStatus = "partial";
        }

        await this.supabase
          .from("registrations")
          .update({ status: newStatus })
          .eq("id", registrationId);
      }

      // Log the action
      await this.logAction(user.id, "delete", "payments", id, payment, null);

      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting payment:", err);
      return { success: false, error: "Failed to delete payment" };
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
export const paymentService = new PaymentService();
