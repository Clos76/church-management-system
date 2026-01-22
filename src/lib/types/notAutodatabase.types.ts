// Database Types - Generated from Supabase Schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin" | "member";
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "member";
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "admin" | "member";
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          family_name: string;
          primary_contact_id: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          home_phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_name: string;
          primary_contact_id?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          home_phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_name?: string;
          primary_contact_id?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          home_phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          family_id: string | null;
          first_name: string;
          last_name: string;
          middle_name: string | null;
          nickname: string | null;
          email: string | null;
          mobile_phone: string | null;
          work_phone: string | null;
          date_of_birth: string | null;
          gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
          marital_status:
            | "single"
            | "married"
            | "divorced"
            | "widowed"
            | "other"
            | null;
          member_status: "visitor" | "attendee" | "member" | "inactive";
          baptism_date: string | null;
          membership_date: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          allergies: string | null;
          medical_notes: string | null;
          profile_picture_url: string | null;
          notes: string | null;
          family_role: "head" | "spouse" | "child" | "other" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id?: string | null;
          first_name: string;
          last_name: string;
          middle_name?: string | null;
          nickname?: string | null;
          email?: string | null;
          mobile_phone?: string | null;
          work_phone?: string | null;
          date_of_birth?: string | null;
          gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          marital_status?:
            | "single"
            | "married"
            | "divorced"
            | "widowed"
            | "other"
            | null;
          member_status?: "visitor" | "attendee" | "member" | "inactive";
          baptism_date?: string | null;
          membership_date?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          allergies?: string | null;
          medical_notes?: string | null;
          profile_picture_url?: string | null;
          notes?: string | null;
          family_role?: "head" | "spouse" | "child" | "other" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string | null;
          first_name?: string;
          last_name?: string;
          middle_name?: string | null;
          nickname?: string | null;
          email?: string | null;
          mobile_phone?: string | null;
          work_phone?: string | null;
          date_of_birth?: string | null;
          gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          marital_status?:
            | "single"
            | "married"
            | "divorced"
            | "widowed"
            | "other"
            | null;
          member_status?: "visitor" | "attendee" | "member" | "inactive";
          baptism_date?: string | null;
          membership_date?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          allergies?: string | null;
          medical_notes?: string | null;
          profile_picture_url?: string | null;
          notes?: string | null;
          family_role?: "head" | "spouse" | "child" | "other" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          color?: string | null;
          created_at?: string;
        };
      };
      member_tags: {
        Row: {
          id: string;
          member_id: string;
          tag_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          tag_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          tag_id?: string;
          assigned_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          event_date: string;
          end_date: string | null;
          location: string | null;
          capacity: number | null;
          price: number;
          allow_partial_payment: boolean;
          status: "draft" | "open" | "closed" | "completed" | "cancelled";
          public_signup_url: string;
          require_approval: boolean;
          confirmation_email_template: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          event_date: string;
          end_date?: string | null;
          location?: string | null;
          capacity?: number | null;
          price?: number;
          allow_partial_payment?: boolean;
          status?: "draft" | "open" | "closed" | "completed" | "cancelled";
          public_signup_url?: string;
          require_approval?: boolean;
          confirmation_email_template?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          event_date?: string;
          end_date?: string | null;
          location?: string | null;
          capacity?: number | null;
          price?: number;
          allow_partial_payment?: boolean;
          status?: "draft" | "open" | "closed" | "completed" | "cancelled";
          public_signup_url?: string;
          require_approval?: boolean;
          confirmation_email_template?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          member_id: string;
          event_id: string;
          status:
            | "pending"
            | "confirmed"
            | "cancelled"
            | "paid"
            | "partial"
            | "waitlist";
          approved_by: string | null;
          approved_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          event_id: string;
          status?:
            | "pending"
            | "confirmed"
            | "cancelled"
            | "paid"
            | "partial"
            | "waitlist";
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          event_id?: string;
          status?:
            | "pending"
            | "confirmed"
            | "cancelled"
            | "paid"
            | "partial"
            | "waitlist";
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          registration_id: string;
          amount: number;
          method: "stripe" | "cash" | "check" | "zelle" | "venmo" | "paypal";
          stripe_payment_intent_id: string | null;
          transaction_id: string | null;
          recorded_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          amount: number;
          method: "stripe" | "cash" | "check" | "zelle" | "venmo" | "paypal";
          stripe_payment_intent_id?: string | null;
          transaction_id?: string | null;
          recorded_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          amount?: number;
          method?: "stripe" | "cash" | "check" | "zelle" | "venmo" | "paypal";
          stripe_payment_intent_id?: string | null;
          transaction_id?: string | null;
          recorded_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_registration_balance: {
        Args: { reg_id: string };
        Returns: number;
      };
    };
  };
}

// npx supabase gen types typescript \
//   --project-id bicgpmgumivahhsrwayl \
//   > src/lib/types/database.types.ts
