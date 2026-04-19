import { createClient } from "@/lib/supabase/client";
import type { ServiceResult, PaginatedResult } from "./types";
import { eventBus } from "@/lib/events/event-bus";

export interface EmailLog {
  id: string;
  profile_id: string | null;
  to_email: string;
  subject: string;
  status: string;
  resend_id: string | null;
  error: string | null;
  sent_at: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  profileId?: string;
}

export class CommunicationService {
  private supabase = createClient();

  /**
   * Send an email via the /api/communications/send Route Handler.
   * Email sending requires the server-side RESEND_API_KEY — this method
   * proxies the request through a Route Handler rather than calling Resend
   * directly from the browser.
   */
  async sendEmail(input: SendEmailInput): Promise<ServiceResult<void>> {
    try {
      const response = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || "Failed to send email" };
      }

      if (input.profileId) {
        eventBus.emit({ type: "email.sent", profileId: input.profileId, subject: input.subject });
      }

      return { success: true };
    } catch (err) {
      console.error("Unexpected error sending email:", err);
      return { success: false, error: "Failed to send email" };
    }
  }

  async getEmailLogs(options?: {
    profileId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ServiceResult<PaginatedResult<EmailLog>>> {
    try {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .order("sent_at", { ascending: false })
        .range(from, to);

      if (options?.profileId) {
        query = query.eq("profile_id", options.profileId);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching email logs:", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          items: (data || []) as EmailLog[],
          total: count ?? 0,
          page,
          pageSize,
        },
      };
    } catch (err) {
      console.error("Unexpected error fetching email logs:", err);
      return { success: false, error: "Failed to fetch email logs" };
    }
  }
}

export const communicationService = new CommunicationService();
