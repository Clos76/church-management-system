// app/leader/events/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eventService } from "@/lib/services/event-service";
import { registrationService } from "@/lib/services/registration-service";
import { paymentService } from "@/lib/services/payment-service";
import { eventLeaderService } from "@/lib/services/event-leader-service";
import { EventWithRegistrations } from "@/lib/types/event";
import { RegistrationWithBalance } from "@/lib/types/registration";
import { EventLeaderPermissions } from "@/lib/types/event-leader";
import Link from "next/link";

export default function LeaderEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventWithRegistrations | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithBalance[]>(
    [],
  );
  const [permissions, setPermissions] = useState<EventLeaderPermissions | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // Add Registration Modal State
  const [showAddRegistration, setShowAddRegistration] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  // Record Payment Modal State
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationWithBalance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "check" | "zelle" | "venmo" | "paypal"
  >("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, [eventId]);

  const checkAccessAndLoad = async () => {
    setLoading(true);

    // Check if user is a leader for this event
    const permissionsResult =
      await eventLeaderService.getLeaderPermissions(eventId);

    if (!permissionsResult.success || !permissionsResult.data) {
      // Not a leader for this event
      router.push("/leader/dashboard");
      return;
    }

    setPermissions(permissionsResult.data);
    await loadEventData();
  };

  const loadEventData = async () => {
    const [eventResult, regsResult] = await Promise.all([
      eventService.getEventById(eventId),
      registrationService.getRegistrations({ eventId }),
    ]);

    if (eventResult.success && eventResult.data) {
      setEvent(eventResult.data);
    }

    if (regsResult.success && regsResult.data) {
      setRegistrations(regsResult.data);
    }

    setLoading(false);
  };

  const handleAddRegistration = async () => {
    if (!event || !regForm.first_name || !regForm.last_name || !regForm.email) {
      alert("Please fill in all required fields");
      return;
    }

    const result = await registrationService.createPublicRegistration({
      event_id: event.id,
      ...regForm,
    });

    if (result.success) {
      setShowAddRegistration(false);
      setRegForm({
        first_name: "",
        last_name: "",
        email: "",
        mobile_phone: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
      });
      await loadEventData();
      alert("Registration added successfully!");
    } else {
      alert(result.error || "Failed to add registration");
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedRegistration) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    setRecordingPayment(true);

    const result = await paymentService.recordManualPayment({
      registration_id: selectedRegistration.id,
      amount,
      method: paymentMethod,
      notes: paymentNotes,
    });

    if (result.success) {
      alert("Payment recorded successfully!");
      setShowRecordPayment(false);
      setSelectedRegistration(null);
      setPaymentAmount("");
      setPaymentNotes("");
      await loadEventData();
    } else {
      alert(`Failed to record payment: ${result.error}`);
    }

    setRecordingPayment(false);
  };

  const openRecordPaymentModal = (registration: RegistrationWithBalance) => {
    setSelectedRegistration(registration);
    setPaymentAmount(registration.balance_due.toString());
    setShowRecordPayment(true);
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      unpaid: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overpaid: "bg-blue-100 text-blue-800",
    } as const;
    return badges[status as keyof typeof badges] || badges.unpaid;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event || !permissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Event not found or access denied</p>
          <Link
            href="/leader/dashboard"
            className="inline-block mt-4 text-purple-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/leader/dashboard"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
              Back to Dashboard
            </Link>

            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Event Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {event.name}
              </h1>
              {event.description && (
                <p className="text-gray-600 mb-4">{event.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                {event.location}
              </div>
            )}

            {event.price > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                ${event.price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {registrations.length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {
                  registrations.filter((r) => r.payment_status === "paid")
                    .length
                }
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Pending Payment</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {
                  registrations.filter(
                    (r) =>
                      r.payment_status === "unpaid" ||
                      r.payment_status === "partial",
                  ).length
                }
              </p>
            </div>
          </div>

          {/* Signup Link */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Public Signup Link:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={eventService.getSignupUrl(event)}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    eventService.getSignupUrl(event),
                  );
                  alert("Link copied to clipboard!");
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Registrations
              </h2>
              {permissions.can_add_registrations && (
                <button
                  onClick={() => setShowAddRegistration(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
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
                  Add Registration
                </button>
              )}
            </div>
          </div>

          {registrations.length === 0 ? (
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
              <p className="text-gray-600 font-medium">No registrations yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Share the signup link or add registrations manually
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {registrations.map((reg: any) => (
                <div
                  key={reg.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-700 font-semibold text-sm">
                            {reg.members?.first_name?.[0]}
                            {reg.members?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {reg.members?.first_name} {reg.members?.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {reg.members?.email}
                          </p>
                        </div>
                      </div>

                      {permissions.can_view_payments && event.price > 0 && (
                        <div className="ml-13 mt-3 flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              ${reg.total_paid?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Balance Due:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              ${reg.balance_due?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(reg.payment_status)}`}
                          >
                            {reg.payment_status}
                          </span>
                        </div>
                      )}
                    </div>

                    {permissions.can_record_payments && reg.balance_due > 0 && (
                      <button
                        onClick={() => openRecordPaymentModal(reg)}
                        className="px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Registration Modal */}
      {showAddRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Add Registration
              </h3>
              <button
                onClick={() => setShowAddRegistration(false)}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.first_name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, first_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.last_name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, last_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) =>
                      setRegForm({ ...regForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={regForm.mobile_phone}
                    onChange={(e) =>
                      setRegForm({ ...regForm, mobile_phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={regForm.emergency_contact_name}
                    onChange={(e) =>
                      setRegForm({
                        ...regForm,
                        emergency_contact_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={regForm.emergency_contact_phone}
                    onChange={(e) =>
                      setRegForm({
                        ...regForm,
                        emergency_contact_phone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={regForm.notes}
                  rows={3}
                  onChange={(e) =>
                    setRegForm({ ...regForm, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddRegistration(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRegistration}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Add Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Record Payment
                </h3>
                <button
                  onClick={() => setShowRecordPayment(false)}
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

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Member:</strong>{" "}
                  {selectedRegistration.members?.first_name}{" "}
                  {selectedRegistration.members?.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Balance Due:</strong> $
                  {selectedRegistration.balance_due.toFixed(2)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                    <option value="venmo">Venmo</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Check number, transaction ID, etc."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowRecordPayment(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={recordingPayment}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {recordingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
