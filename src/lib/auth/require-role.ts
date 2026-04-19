import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export async function requireRole(
  role: string | string[],
): Promise<AuthUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return {
    id: user.id,
    email: user.email ?? null,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role,
  };
}
