// lib/types/event.ts

import { Database } from "./database.types";

// Base event type from database
export type Event = Database["public"]["Tables"]["events"]["Row"];

// Input types
export type CreateEventInput = Omit<
  Database["public"]["Tables"]["events"]["Insert"],
  "id" | "created_at" | "updated_at" | "public_signup_url"
>;

export type UpdateEventInput = Partial<CreateEventInput> & {
  id: string;
};

// Event with registration count
export interface EventWithStats extends Event {
  registration_count?: number;
  confirmed_count?: number;
  capacity_remaining?: number;
  total_revenue?: number;
  paid_count?: number;
}

// Event with registrations
export interface EventWithRegistrations extends Event {
  registrations?: Array<{
    id: string;
    status: Database["public"]["Tables"]["registrations"]["Row"]["status"];
    created_at: string;
    members: {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
    };
  }>;
}

// Search/filter types
export interface EventSearchParams {
  query?: string;
  status?: Event["status"];
  dateFrom?: string;
  dateTo?: string;
}

// Event statistics
export interface EventStats {
  total: number;
  byStatus: Record<Event["status"], number>;
  upcomingCount: number;
  pastCount: number;
}

// Public event (limited fields for registration page)
export interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  price: number;
  allow_partial_payment: boolean;
  status: Event["status"];
  registration_count?: number;
  capacity_remaining?: number | null;
}
