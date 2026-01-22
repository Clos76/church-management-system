// lib/types/registration.ts

import { Database } from "./database.types";

// Base registration type
export type Registration = Database["public"]["Tables"]["registrations"]["Row"];

// Input types
export type CreateRegistrationInput = Omit<
  Database["public"]["Tables"]["registrations"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateRegistrationInput = Partial<CreateRegistrationInput> & {
  id: string;
};

// Registration with related data
export interface RegistrationWithDetails extends Registration {
  members: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    mobile_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
  events: {
    id: string;
    name: string;
    event_date: string;
    price: number;
    allow_partial_payment: boolean;
  };
  payments?: Array<{
    id: string;
    amount: number;
    method: Database["public"]["Tables"]["payments"]["Row"]["method"];
    created_at: string;
    recorded_by: string | null;
  }>;
}

// Registration with balance calculation
export interface RegistrationWithBalance extends RegistrationWithDetails {
  total_paid: number;
  balance_due: number;
  payment_status: "unpaid" | "partial" | "paid" | "overpaid";
}

// Public registration input (from signup form)
export interface PublicRegistrationInput {
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes?: string;
}

// Search/filter types
export interface RegistrationSearchParams {
  eventId?: string;
  memberId?: string;
  status?: Registration["status"];
  paymentStatus?: "unpaid" | "partial" | "paid";
  dateFrom?: string;
  dateTo?: string;
}

// Statistics
export interface RegistrationStats {
  total: number;
  byStatus: Record<Registration["status"], number>;
  byPaymentStatus: {
    unpaid: number;
    partial: number;
    paid: number;
  };
  totalRevenue: number;
  outstandingBalance: number;
}
