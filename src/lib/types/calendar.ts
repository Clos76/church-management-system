// lib/types/calendar.ts

// Define Calendar type manually since it's a new table
export interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Input types
export type CreateCalendarInput = Omit<
  Calendar,
  "id" | "created_at" | "updated_at"
>;

export type UpdateCalendarInput = Partial<CreateCalendarInput> & {
  id: string;
};

// Calendar with event count
export interface CalendarWithStats extends Calendar {
  event_count?: number;
  upcoming_event_count?: number;
}

// Calendar colors (preset options for UI)
export const CALENDAR_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Green", value: "#10B981" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#22D3EE" },
  { name: "Amber", value: "#F97316" },
  { name: "Violet", value: "#A855F7" },
  { name: "Sky", value: "#0EA5E9" },
] as const;
