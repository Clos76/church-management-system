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

// Add these fields to the Member interface
export interface MemberClasses {
  // ... all your existing fields ...

  // Follow-up tracking - ADD THESE
  new_believers_class_1?: boolean;
  new_believers_class_2?: boolean;
  new_believers_class_3?: boolean;
  new_believers_class_4?: boolean;
  pillars_class_1?: boolean;
  pillars_class_2?: boolean;
  pillars_class_3?: boolean;
  pillars_class_4?: boolean;
  pillars_class_5?: boolean;
  pillars_class_6?: boolean;
  pillars_class_7?: boolean;
}
