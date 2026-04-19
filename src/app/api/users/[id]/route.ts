import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_ROLES = ["admin", "event_leader", "member"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (requesterProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role: newRole } = body;

  if (!VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { id: targetId } = await params;

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single();

  const oldRole = targetProfile?.role;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "update",
    table_name: "profiles",
    record_id: targetId,
    description: `Changed user role from ${oldRole} to ${newRole}`,
  });

  return NextResponse.json({ success: true });
}
