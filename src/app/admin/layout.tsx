import { requireRole } from "@/lib/auth/require-role";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

  return <AdminShell user={user}>{children}</AdminShell>;
}
