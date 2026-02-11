// app/admin/events/[id]/leaders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eventService } from "@/lib/services/event-service";
import { eventLeaderService } from "@/lib/services/event-leader-service";
import { Event } from "@/lib/types/event";
import {
  EventLeaderWithProfile,
  DEFAULT_LEADER_PERMISSIONS,
} from "@/lib/types/event-leader";
import Link from "next/link";

export default function EventLeadersPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [leaders, setLeaders] = useState<EventLeaderWithProfile[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLeader, setShowAddLeader] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);

    const [eventResult, leadersResult] = await Promise.all([
      eventService.getEventById(eventId),
      eventLeaderService.getEventLeaders(eventId),
    ]);

    if (eventResult.success && eventResult.data) {
      setEvent(eventResult.data);
    }

    if (leadersResult.success && leadersResult.data) {
      setLeaders(leadersResult.data);
    }

    // Load all users (profiles) for assignment
    const supabase = createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, role");

    if (profiles) {
      // DON'T fetch emails from auth.admin - just use profile data
      setAllUsers(profiles);
    }

    setLoading(false);
  };

  const handleAssignLeader = async () => {
    if (!selectedUser) {
      alert("Please select a user");
      return;
    }

    const result = await eventLeaderService.assignLeader({
      event_id: eventId,
      user_id: selectedUser,
      permissions: DEFAULT_LEADER_PERMISSIONS,
    });

    if (result.success) {
      setShowAddLeader(false);
      setSelectedUser("");
      setSearchQuery("");
      await loadData();
    } else {
      alert(result.error || "Failed to assign leader");
    }
  };

  const handleRemoveLeader = async (leaderId: string) => {
    if (!confirm("Are you sure you want to remove this leader?")) {
      return;
    }

    const result = await eventLeaderService.removeLeader(leaderId);

    if (result.success) {
      await loadData();
    } else {
      alert(result.error || "Failed to remove leader");
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    // Don't show users who are already leaders
    if (leaders.some((l) => l.user_id === user.id)) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Event not found</p>
        <Link
          href="/admin/events"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/events/${eventId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Event
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage event leaders and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddLeader(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Assign Leader
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-1">
              Event Leader Delegation
            </h3>
            <p className="text-sm text-blue-800">
              Assign trusted volunteers or staff to help manage this event.
              Leaders can view registrations, add new attendees, and record
              payments based on their permissions. They'll access events through
              the Leader Portal at{" "}
              <span className="font-mono bg-blue-100 px-1 rounded">
                /leader/dashboard
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Leaders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Event Leaders ({leaders.length})
          </h2>
        </div>

        {leaders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-600 font-medium">No leaders assigned yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Click "Assign Leader" to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {leaders.map((leader) => (
              <div
                key={leader.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold">
                        {leader.profiles.first_name?.[0]}
                        {leader.profiles.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {leader.profiles.first_name} {leader.profiles.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {leader.profiles.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned{" "}
                        {leader.assigned_at
                          ? new Date(leader.assigned_at).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveLeader(leader.id)}
                    className="px-4 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    Remove
                  </button>
                </div>

                {/* Permissions Display */}
                <div className="mt-4 ml-15 flex flex-wrap gap-2">
                  {Object.entries(leader.permissions as any).map(
                    ([key, value]) => {
                      if (value) {
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                          >
                            ✓ {key.replace("can_", "").replace(/_/g, " ")}
                          </span>
                        );
                      }
                      return null;
                    },
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Leader Modal */}
      {showAddLeader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Assign Event Leader
                </h3>
                <button
                  onClick={() => {
                    setShowAddLeader(false);
                    setSelectedUser("");
                    setSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Users
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* User List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User to Assign
                </label>
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery
                        ? "No users found matching your search"
                        : "No users available"}
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUser === user.id
                            ? "bg-blue-100 border-2 border-blue-500"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-700 font-semibold text-sm">
                            {user.first_name?.[0] || "?"}
                            {user.last_name?.[0] || ""}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {user.first_name || "Unknown"}{" "}
                            {user.last_name || ""}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        {selectedUser === user.id && (
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddLeader(false);
                  setSelectedUser("");
                  setSearchQuery("");
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignLeader}
                disabled={!selectedUser}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Leader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
