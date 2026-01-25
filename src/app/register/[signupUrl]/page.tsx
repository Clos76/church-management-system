"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { eventService } from "@/lib/services/event-service";
import { registrationService } from "@/lib/services/registration-service";
import { PublicEvent } from "@/lib/types/event";

export default function PublicRegistrationPage() {
  const params = useParams();
  const signupUrl = params.signupUrl as string;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    payment_method: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEvent();
  }, [signupUrl]);

  const loadEvent = async () => {
    setLoading(true);
    const result = await eventService.getEventBySignupUrl(signupUrl);

    if (result.success && result.data) {
      setEvent(result.data);
    }
    setLoading(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim())
      newErrors.first_name = "First name is required";
    if (!formData.last_name.trim())
      newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.mobile_phone.trim())
      newErrors.mobile_phone = "Phone number is required";
    if (!formData.emergency_contact_name.trim())
      newErrors.emergency_contact_name = "Emergency contact name is required";
    if (!formData.emergency_contact_phone.trim())
      newErrors.emergency_contact_phone = "Emergency contact phone is required";
    if (event && event.price > 0 && !formData.payment_method) {
      newErrors.payment_method = "Please select a payment method";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !event) return;

    setSubmitting(true);

    const result = await registrationService.createPublicRegistration({
      event_id: event.id,
      ...formData,
    });

    setSubmitting(false);

    if (result.success) {
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      alert(result.error || "Failed to register. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Event Not Found
          </h2>
          <p className="text-gray-600">
            This event link may be invalid or the event may no longer be
            accepting registrations.
          </p>
        </div>
      </div>
    );
  }

  if (event.status !== "open") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-orange-400 mx-auto mb-4"
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Registration Closed
          </h2>
          <p className="text-gray-600">
            This event is no longer accepting registrations.
          </p>
        </div>
      </div>
    );
  }

  const isAtCapacity =
    event.capacity &&
    event.capacity_remaining !== null &&
    event.capacity_remaining !== undefined &&
    event.capacity_remaining <= 0;

  if (isAtCapacity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Event Full
          </h2>
          <p className="text-gray-600">
            This event has reached maximum capacity and is no longer accepting
            registrations.
          </p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for registering for <strong>{event.name}</strong>. You
            will receive a confirmation email at{" "}
            <strong>{formData.email}</strong>.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Event Details:</strong>
            </p>
            <p className="text-sm text-blue-800 mt-1">
              {new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {event.location && (
              <p className="text-sm text-blue-800 mt-1">{event.location}</p>
            )}
            {event.price > 0 && (
              <>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Amount Due:</strong> ${event.price.toFixed(2)}
                </p>
                {formData.payment_method && (
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Payment Method:</strong>{" "}
                    {formData.payment_method.charAt(0).toUpperCase() +
                      formData.payment_method.slice(1)}
                  </p>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-500">
            If you don't receive an email within a few minutes, please check
            your spam folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {event.location}
              </div>
            )}
            {event.price > 0 && (
              <div className="flex items-center gap-2">
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
            {event.capacity &&
              event.capacity_remaining !== null &&
              event.capacity_remaining !== undefined && (
                <div className="flex items-center gap-2">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {event.capacity_remaining} spots remaining
                </div>
              )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Registration Form
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.first_name ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.last_name ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.last_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_phone: e.target.value })
                    }
                    className={`w-full px-4 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.mobile_phone ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.mobile_phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.mobile_phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_name: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.emergency_contact_name ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.emergency_contact_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.emergency_contact_name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Phone{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_phone: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.emergency_contact_phone ? "border-red-300" : "border-gray-300"}`}
                  />
                  {errors.emergency_contact_phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.emergency_contact_phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes or Questions (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any dietary restrictions, accessibility needs, or questions..."
              />
            </div>

            {event.price > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Information
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>Event Cost:</strong> ${event.price.toFixed(2)}
                  </p>
                  {event.allow_partial_payment && (
                    <p className="text-sm text-blue-800 mt-1">
                      Partial payments are accepted for this event.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How will you pay? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_method: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.payment_method
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Select payment method</option>
                    <option value="cash">Cash (pay on-site)</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                    <option value="venmo">Venmo</option>
                    <option value="paypal">PayPal</option>
                    <option value="card">Credit/Debit Card (online)</option>
                  </select>
                  {errors.payment_method && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.payment_method}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    You can pay using any of these methods. Payment is not
                    required to complete registration.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Submitting..." : "Complete Registration"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
