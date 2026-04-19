import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "event_leader") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { to, subject, html, profileId } = body;

  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: "to, subject, and html are required" },
      { status: 400 },
    );
  }

  let resendId: string | null = null;
  let sendError: string | null = null;
  let status = "sent";

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — email not delivered");
    status = "skipped";
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CC Rosarito <noreply@ccrosarito.org>",
          to,
          subject,
          html,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        resendId = data.id ?? null;
      } else {
        const data = await res.json();
        sendError = data.message ?? "Resend API error";
        status = "failed";
      }
    } catch (err) {
      sendError = String(err);
      status = "failed";
    }
  }

  await supabase.from("email_logs").insert({
    profile_id: profileId ?? null,
    to_email: to,
    subject,
    status,
    resend_id: resendId,
    error: sendError,
  });

  if (status === "failed") {
    return NextResponse.json({ error: sendError }, { status: 502 });
  }

  return NextResponse.json({ success: true, resendId });
}
