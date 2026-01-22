"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface DashboardStats {
  totalMembers: number;
  totalEvents: number;
  activeRegistrations: number;
  pendingPayments: number;
  upcomingEvents: any[];
  recentRegistrations: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalEvents: 0,
    activeRegistrations: 0,
    pendingPayments: 0,
    upcomingEvents: [],
    recentRegistrations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const supabase = createClient();

    try {
      //get total members count
      const { count: membersCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });

      //get total evetns count
      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

      //get active registrations count
      const { count: registrationsCount } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "confirmed", "partial"]);

      //get pending payments count (registrations with balance due)
      const { data: registrationsWithPayments } = await supabase
        .from("registrations")
        .select(
          `
                id,
                event_id,
                events(price),
                payment(amount)
                `,
        )
        .in("status", ["pending", "partial"]);

      let pendingPaymentsCount = 0;
      registrationsWithPayments?.forEach((reg: any) => {
        const eventPrice = reg.events?.price || 0;
        const totalPaid =
          reg.payments?.reduce(
            (sum: number, p: any) => sum + parseFloat(p.amount),
            0,
          ) || 0;

        if (eventPrice > totalPaid) {
          pendingPaymentsCount++;
        }
      });

      //get upcoming events
      const { data: upcomingEvents } = await supabase
        .from("events")
        .select("id, name, event_date, status")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      //get recent registrations
      const { data: recentRegistrations } = await supabase
        .from("registrations")
        .select(
          `
                id,
                created_at,
                status,
                member(firs_name, last_name), 
                events(name)
                `,
        )
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalMembers: membersCount || 0,
        totalEvents: eventsCount || 0,
        activeRegistrations: registrationsCount || 0,
        pendingPayments: pendingPaymentsCount,
        upcomingEvents: upcomingEvents || [],
        recentRegistrations: recentRegistrations || [],
      });
    } catch (error) {
      console.log("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Members",
      value: stats.totalMembers,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      color: "bg-blue-500",
      href: "/admin/members",
    },

    {
      name: "Total Events",
      value: stats.totalEvents,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "bg-purple-500",
      href: "/admin/events",
    },

    {
      name: "Active Registrations",
      value: stats.activeRegistrations,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: "bg-green-500",
      href: "/admin/registrations",
    },

    {
      name: "Pending Payments",
      value: stats.pendingPayments,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "bg-orange-500",
      href: "/admin/payments",
    },
  ];

  return (
    <div className="space-y-8">
      {/**Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's what's happening with your church.
        </p>
      </div>

      {/** Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover: shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <div className="text-white">{stat.icon}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
