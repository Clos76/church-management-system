// lib/types/payment.ts

import { Database } from "./database.types";

// Base payment type
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

// Input types
export type CreatePaymentInput = Omit<
  Database["public"]["Tables"]["payments"]["Insert"],
  "id" | "created_at"
>;

export type UpdatePaymentInput = Partial<CreatePaymentInput> & {
  id: string;
};

// Payment with related data
export interface PaymentWithDetails extends Payment {
  registrations: {
    id: string;
    member_id: string;
    event_id: string;
    members: {
      first_name: string;
      last_name: string;
      email: string | null;
    };
    events: {
      name: string;
      event_date: string;
      price: number;
    };
  };
  recorded_by_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Manual payment input (admin records cash/check/etc)
export interface ManualPaymentInput {
  registration_id: string;
  amount: number;
  method: "cash" | "check" | "zelle" | "venmo" | "paypal";
  transaction_id?: string;
  notes?: string;
}

// Stripe payment result
export interface StripePaymentResult {
  payment_intent_id: string;
  amount: number;
  status: "succeeded" | "processing" | "failed";
  client_secret?: string;
}

// Search/filter types
export interface PaymentSearchParams {
  registrationId?: string;
  eventId?: string;
  memberId?: string;
  method?: Payment["method"];
  dateFrom?: string;
  dateTo?: string;
}

// Statistics
export interface PaymentStats {
  total_amount: number;
  total_count: number;
  by_method: Record<
    Payment["method"],
    {
      count: number;
      amount: number;
    }
  >;
  recent_payments: PaymentWithDetails[];
}
