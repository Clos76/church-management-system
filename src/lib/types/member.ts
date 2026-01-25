// // lib/types/member.ts

import { Database } from "./database.types";

// Base member type from database
export type Member = Database["public"]["Tables"]["members"]["Row"];

// Input types for creating/updating members
export type CreateMemberInput = Omit<
  Database["public"]["Tables"]["members"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateMemberInput = Partial<CreateMemberInput> & {
  id: string;
};

// Member with related data (for joins)
export interface MemberWithFamily extends Member {
  families?: {
    id: string;
    family_name: string;
  } | null;
}

export interface MemberWithTags extends Member {
  member_tags?: Array<{
    tags: {
      id: string;
      name: string;
      category: string | null;
      color: string | null;
    };
  }>;
}

// Search/filter types
export interface MemberSearchParams {
  query?: string;
  status?: Member["member_status"];
  familyId?: string;
  tags?: string[];
}

// Statistics
export interface MemberStats {
  total: number;
  byStatus: Record<NonNullable<Member["member_status"]>, number>;
  newThisMonth: number;
  newThisYear: number;
}
