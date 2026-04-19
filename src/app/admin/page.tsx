import Link from "next/link";
import { getCachedDashboardStats } from "@/lib/services/report-service-server";

export default async function AdminDashboard() {
  const stats = await getCachedDashboardStats();

  const statCards = [
    {
      name: "Total Members",
      value: stats.totalMembers,
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: "bg-blue-500",
      href: "/admin/members",
    },
    {
      name: "Total Events",
      value: stats.totalEvents,
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "bg-purple-500",
      href: "/admin/events",
    },
    {
      name: "Registrations",
      value: stats.activeRegistrations,
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "bg-green-500",
      href: "/admin/registrations",
    },
    {
      name: "Pending Payments",
      value: stats.pendingPayments,
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-orange-500",
      href: "/admin/payments",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here&apos;s what&apos;s happening with your church.
        </p>
      </div>

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow active:scale-[0.98]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg self-start`}>
                <div className="text-white">{stat.icon}</div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-gray-500 leading-tight">{stat.name}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/admin/events" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          {stats.upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 text-sm">No upcoming events</p>
              <Link href="/admin/events" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.event_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Registrations</h2>
            <Link href="/admin/registrations" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          {stats.recentRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-sm">No registrations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentRegistrations.map((reg: any) => (
                <div key={reg.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-semibold text-xs">
                      {reg.members?.first_name?.[0]}{reg.members?.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {reg.members?.first_name} {reg.members?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{reg.events?.name}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                      reg.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : reg.status === "partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions — 2 cols on mobile, 4 on desktop */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              href: "/admin/members",
              color: "blue",
              label: "Add Member",
              sub: "Create new member",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
            },
            {
              href: "/admin/events",
              color: "purple",
              label: "Create Event",
              sub: "Plan new event",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />,
            },
            {
              href: "/admin/registrations",
              color: "green",
              label: "Registrations",
              sub: "Manage signups",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
            },
            {
              href: "/admin/payments",
              color: "orange",
              label: "Record Payment",
              sub: "Track finances",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 border-gray-100 hover:border-${action.color}-400 hover:bg-${action.color}-50 transition-all group text-center sm:text-left`}
            >
              <div className={`w-10 h-10 bg-${action.color}-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-${action.color}-200`}>
                <svg className={`w-5 h-5 text-${action.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {action.icon}
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
