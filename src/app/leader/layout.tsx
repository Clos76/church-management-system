import { requireRole } from "@/lib/auth/require-role";
import LeaderShell from "./_components/LeaderShell";

export default async function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin", "event_leader"]);

  return <LeaderShell>{children}</LeaderShell>;
}
