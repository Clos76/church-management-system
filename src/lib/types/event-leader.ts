// lib/types/event-leader.ts

import { Database } from "./database.types";

// Base event leader type from database
export type EventLeader = Database["public"]["Tables"]["event_leaders"]["Row"];

// Event leader permissions structure
export interface EventLeaderPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_add_registrations: boolean;
  can_record_payments: boolean;
  can_view_payments: boolean;
}

// Default permissions for new leaders
export const DEFAULT_LEADER_PERMISSIONS: EventLeaderPermissions = {
  can_view: true,
  can_edit: true,
  can_add_registrations: true,
  can_record_payments: true,
  can_view_payments: true,
};

// Event leader with user profile details
export interface EventLeaderWithProfile extends EventLeader {
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

// Event leader with event details
export interface EventLeaderWithEvent extends EventLeader {
  events: {
    id: string;
    name: string;
    event_date: string;
    status: string;
    location: string | null;
  };
}

// Input types
export interface AssignEventLeaderInput {
  event_id: string;
  user_id: string;
  permissions?: Partial<EventLeaderPermissions>;
}

export interface UpdateEventLeaderPermissionsInput {
  event_leader_id: string;
  permissions: Partial<EventLeaderPermissions>;
}

// Leader dashboard stats
export interface LeaderDashboardStats {
  total_events: number;
  active_events: number;
  total_registrations: number;
  pending_payments: number;
}

// Event with leader access indicator
export interface EventWithLeaderAccess {
  event: any;
  is_leader: boolean;
  permissions: EventLeaderPermissions | null;
}
