"use client";

import { useEffect, useState } from "react";
import { calendarService } from "@/lib/services/calendar-service";
import { CalendarWithStats } from "@/lib/types/calendar";
import { CALENDAR_COLORS } from "@/lib/types/calendar";
import Link from "next/link";

export default function CalendarsPage() {
  const [calendars, setCalendars] = useState<CalendarWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCalendar, setEditingCalendar] =
    useState<CalendarWithStats | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    is_public: true,
  });

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    setLoading(true);
    const result = await calendarService.getCalendars({ includeStats: true });
    if (result.success && result.data) {
      setCalendars(result.data);
    }
    setLoading(false);
  };

  const handleOpenModal = (calendar?: CalendarWithStats) => {
    if (calendar) {
      setEditingCalendar(calendar);
      setFormData({
        name: calendar.name,
        description: calendar.description || "",
        color: calendar.color || "#3B82F6",
        is_public: calendar.is_public,
      });
    } else {
      setEditingCalendar(null);
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        is_public: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCalendar(null);
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      is_public: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Calendar name is required");
      return;
    }

    if (editingCalendar) {
      const result = await calendarService.updateCalendar({
        id: editingCalendar.id,
        ...formData,
      });
      if (result.success) {
        await loadCalendars();
        handleCloseModal();
      } else {
        alert(result.error || "Failed to update calendar");
      }
    } else {
      const result = await calendarService.createCalendar({
        ...formData,
        display_order: calendars.length,
      });
      if (result.success) {
        await loadCalendars();
        handleCloseModal();
      } else {
        alert(result.error || "Failed to create calendar");
      }
    }
  };

  const handleDelete = async (id: string) => {
    const result = await calendarService.deleteCalendar(id);
    if (result.success) {
      await loadCalendars();
      setShowDeleteConfirm(null);
    } else {
      alert(result.error || "Failed to delete calendar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendars</h1>
          <p className="mt-1 text-sm text-gray-600">
            Organize events by ministry, program, or event type
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Events
          </Link>
          <button
            onClick={() => handleOpenModal()}
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
            Add Calendar
          </button>
        </div>
      </div>

      {/* Calendars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-colors"
          >
            <div
              className="h-2"
              style={{ backgroundColor: calendar.color || "#3B82F6" }}
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {calendar.name}
                  </h3>
                  {calendar.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {calendar.description}
                    </p>
                  )}
                </div>
                {!calendar.is_public && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    Private
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Events</span>
                  <span className="font-semibold text-gray-900">
                    {calendar.event_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Upcoming Events</span>
                  <span className="font-semibold text-blue-600">
                    {calendar.upcoming_event_count || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenModal(calendar)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(calendar.id)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {calendars.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600 font-medium">No calendars yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first calendar to organize events
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
              Create First Calendar
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCalendar ? "Edit Calendar" : "Create Calendar"}
              </h3>
              <button
                onClick={handleCloseModal}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Men's Ministry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this calendar..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.value })
                      }
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? "border-gray-900 scale-110"
                          : "border-gray-300 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) =>
                    setFormData({ ...formData, is_public: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  Show this calendar to the public
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {editingCalendar ? "Save Changes" : "Create Calendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Calendar
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this calendar? Events in this
              calendar will NOT be deleted, but they will lose their calendar
              assignment.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
