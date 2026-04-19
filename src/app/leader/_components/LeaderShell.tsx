"use client";

import "@/lib/events/setup";
import { ToastProvider } from "@/components/ui/Toast";

export default function LeaderShell({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
