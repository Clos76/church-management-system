// app/admin/members/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { memberService } from "@/lib/services/member-service";
import { Member } from "@/lib/types/member";
import Link from "next/link";

type ModalType =
  | "basic"
  | "contact"
  | "personal"
  | "church"
  | "emergency"
  | "medical"
  | "notes"
  | null;

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);

  // Form states for each modal
  const [basicForm, setBasicForm] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
    nickname: "",
  });

  const [contactForm, setContactForm] = useState({
    email: "",
    mobile_phone: "",
    work_phone: "",
  });

  const [personalForm, setPersonalForm] = useState({
    date_of_birth: "",
    gender: "" as "" | "male" | "female" | "other" | "prefer_not_to_say",
    marital_status: "" as
      | ""
      | "single"
      | "married"
      | "divorced"
      | "widowed"
      | "other",
  });

  const [churchForm, setChurchForm] = useState({
    member_status: "visitor" as "visitor" | "attendee" | "member" | "inactive",
    baptism_date: "",
    membership_date: "",
  });

  const [emergencyForm, setEmergencyForm] = useState({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  });

  const [medicalForm, setMedicalForm] = useState({
    allergies: "",
    medical_notes: "",
  });

  const [notesForm, setNotesForm] = useState({
    notes: "",
  });

  useEffect(() => {
    loadMember();
  }, [memberId]);

  const loadMember = async () => {
    setLoading(true);
    const result = await memberService.getMemberById(memberId);
    if (result.success && result.data) {
      setMember(result.data);
      populateForms(result.data);
    } else {
      router.push("/admin/members");
    }
    setLoading(false);
  };

  const populateForms = (data: Member) => {
    setBasicForm({
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name || "",
      nickname: data.nickname || "",
    });

    setContactForm({
      email: data.email || "",
      mobile_phone: data.mobile_phone || "",
      work_phone: data.work_phone || "",
    });

    setPersonalForm({
      date_of_birth: data.date_of_birth || "",
      gender: (data.gender as any) || "",
      marital_status: (data.marital_status as any) || "",
    });

    setChurchForm({
      member_status: data.member_status,
      baptism_date: data.baptism_date || "",
      membership_date: data.membership_date || "",
    });

    setEmergencyForm({
      emergency_contact_name: data.emergency_contact_name || "",
      emergency_contact_phone: data.emergency_contact_phone || "",
      emergency_contact_relationship: data.emergency_contact_relationship || "",
    });

    setMedicalForm({
      allergies: data.allergies || "",
      medical_notes: data.medical_notes || "",
    });

    setNotesForm({
      notes: data.notes || "",
    });
  };

  const handleSave = async (section: ModalType) => {
    if (!member) return;

    setSaving(true);
    let updates = {};

    switch (section) {
      case "basic":
        updates = basicForm;
        break;
      case "contact":
        updates = contactForm;
        break;
      case "personal":
        updates = personalForm;
        break;
      case "church":
        updates = churchForm;
        break;
      case "emergency":
        updates = emergencyForm;
        break;
      case "medical":
        updates = medicalForm;
        break;
      case "notes":
        updates = notesForm;
        break;
    }

    const result = await memberService.updateMember({
      id: member.id,
      ...updates,
    });

    if (result.success && result.data) {
      setMember(result.data);
      populateForms(result.data);
      setActiveModal(null);
    } else {
      alert(result.error || "Failed to update member");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading member...</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/members"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600"
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
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {member.first_name} {member.last_name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Member since {new Date(member.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            member.member_status === "member"
              ? "bg-green-100 text-green-800"
              : member.member_status === "attendee"
                ? "bg-blue-100 text-blue-800"
                : member.member_status === "visitor"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {member.member_status}
        </span>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <InfoCard
          title="Basic Information"
          onEdit={() => setActiveModal("basic")}
          items={[
            { label: "First Name", value: member.first_name },
            { label: "Last Name", value: member.last_name },
            { label: "Middle Name", value: member.middle_name },
            { label: "Nickname", value: member.nickname },
          ]}
        />

        {/* Contact Information */}
        <InfoCard
          title="Contact Information"
          onEdit={() => setActiveModal("contact")}
          items={[
            { label: "Email", value: member.email },
            { label: "Mobile Phone", value: member.mobile_phone },
            { label: "Work Phone", value: member.work_phone },
          ]}
        />

        {/* Personal Information */}
        <InfoCard
          title="Personal Information"
          onEdit={() => setActiveModal("personal")}
          items={[
            {
              label: "Date of Birth",
              value: member.date_of_birth
                ? new Date(member.date_of_birth).toLocaleDateString()
                : null,
            },
            { label: "Gender", value: member.gender },
            { label: "Marital Status", value: member.marital_status },
          ]}
        />

        {/* Church Information */}
        <InfoCard
          title="Church Information"
          onEdit={() => setActiveModal("church")}
          items={[
            { label: "Member Status", value: member.member_status },
            {
              label: "Baptism Date",
              value: member.baptism_date
                ? new Date(member.baptism_date).toLocaleDateString()
                : null,
            },
            {
              label: "Membership Date",
              value: member.membership_date
                ? new Date(member.membership_date).toLocaleDateString()
                : null,
            },
          ]}
        />

        {/* Emergency Contact */}
        <InfoCard
          title="Emergency Contact"
          onEdit={() => setActiveModal("emergency")}
          items={[
            { label: "Contact Name", value: member.emergency_contact_name },
            { label: "Contact Phone", value: member.emergency_contact_phone },
            {
              label: "Relationship",
              value: member.emergency_contact_relationship,
            },
          ]}
        />

        {/* Medical Information */}
        <InfoCard
          title="Medical Information"
          onEdit={() => setActiveModal("medical")}
          items={[
            { label: "Allergies", value: member.allergies },
            { label: "Medical Notes", value: member.medical_notes },
          ]}
        />
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <button
            onClick={() => setActiveModal("notes")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap">
          {member.notes || "No notes available"}
        </p>
      </div>

      {/* Modals */}
      {activeModal === "basic" && (
        <EditModal
          title="Edit Basic Information"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("basic")}
          saving={saving}
        >
          <div className="space-y-4">
            <Input
              label="First Name"
              required
              value={basicForm.first_name}
              onChange={(e) =>
                setBasicForm({ ...basicForm, first_name: e.target.value })
              }
            />
            <Input
              label="Last Name"
              required
              value={basicForm.last_name}
              onChange={(e) =>
                setBasicForm({ ...basicForm, last_name: e.target.value })
              }
            />
            <Input
              label="Middle Name"
              value={basicForm.middle_name}
              onChange={(e) =>
                setBasicForm({ ...basicForm, middle_name: e.target.value })
              }
            />
            <Input
              label="Nickname"
              value={basicForm.nickname}
              onChange={(e) =>
                setBasicForm({ ...basicForm, nickname: e.target.value })
              }
            />
          </div>
        </EditModal>
      )}

      {activeModal === "contact" && (
        <EditModal
          title="Edit Contact Information"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("contact")}
          saving={saving}
        >
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={contactForm.email}
              onChange={(e) =>
                setContactForm({ ...contactForm, email: e.target.value })
              }
            />
            <Input
              label="Mobile Phone"
              type="tel"
              value={contactForm.mobile_phone}
              onChange={(e) =>
                setContactForm({ ...contactForm, mobile_phone: e.target.value })
              }
            />
            <Input
              label="Work Phone"
              type="tel"
              value={contactForm.work_phone}
              onChange={(e) =>
                setContactForm({ ...contactForm, work_phone: e.target.value })
              }
            />
          </div>
        </EditModal>
      )}

      {activeModal === "personal" && (
        <EditModal
          title="Edit Personal Information"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("personal")}
          saving={saving}
        >
          <div className="space-y-4">
            <Input
              label="Date of Birth"
              type="date"
              value={personalForm.date_of_birth}
              onChange={(e) =>
                setPersonalForm({
                  ...personalForm,
                  date_of_birth: e.target.value,
                })
              }
            />
            <Select
              label="Gender"
              value={personalForm.gender}
              onChange={(e) =>
                setPersonalForm({
                  ...personalForm,
                  gender: e.target.value as any,
                })
              }
              options={[
                { value: "", label: "Select..." },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
                { value: "prefer_not_to_say", label: "Prefer not to say" },
              ]}
            />
            <Select
              label="Marital Status"
              value={personalForm.marital_status}
              onChange={(e) =>
                setPersonalForm({
                  ...personalForm,
                  marital_status: e.target.value as any,
                })
              }
              options={[
                { value: "", label: "Select..." },
                { value: "single", label: "Single" },
                { value: "married", label: "Married" },
                { value: "divorced", label: "Divorced" },
                { value: "widowed", label: "Widowed" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
        </EditModal>
      )}

      {activeModal === "church" && (
        <EditModal
          title="Edit Church Information"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("church")}
          saving={saving}
        >
          <div className="space-y-4">
            <Select
              label="Member Status"
              value={churchForm.member_status}
              onChange={(e) =>
                setChurchForm({
                  ...churchForm,
                  member_status: e.target.value as any,
                })
              }
              options={[
                { value: "visitor", label: "Visitor" },
                { value: "attendee", label: "Attendee" },
                { value: "member", label: "Member" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <Input
              label="Baptism Date"
              type="date"
              value={churchForm.baptism_date}
              onChange={(e) =>
                setChurchForm({ ...churchForm, baptism_date: e.target.value })
              }
            />
            <Input
              label="Membership Date"
              type="date"
              value={churchForm.membership_date}
              onChange={(e) =>
                setChurchForm({
                  ...churchForm,
                  membership_date: e.target.value,
                })
              }
            />
          </div>
        </EditModal>
      )}

      {activeModal === "emergency" && (
        <EditModal
          title="Edit Emergency Contact"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("emergency")}
          saving={saving}
        >
          <div className="space-y-4">
            <Input
              label="Contact Name"
              value={emergencyForm.emergency_contact_name}
              onChange={(e) =>
                setEmergencyForm({
                  ...emergencyForm,
                  emergency_contact_name: e.target.value,
                })
              }
            />
            <Input
              label="Contact Phone"
              type="tel"
              value={emergencyForm.emergency_contact_phone}
              onChange={(e) =>
                setEmergencyForm({
                  ...emergencyForm,
                  emergency_contact_phone: e.target.value,
                })
              }
            />
            <Input
              label="Relationship"
              value={emergencyForm.emergency_contact_relationship}
              onChange={(e) =>
                setEmergencyForm({
                  ...emergencyForm,
                  emergency_contact_relationship: e.target.value,
                })
              }
            />
          </div>
        </EditModal>
      )}

      {activeModal === "medical" && (
        <EditModal
          title="Edit Medical Information"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("medical")}
          saving={saving}
        >
          <div className="space-y-4">
            <Textarea
              label="Allergies"
              value={medicalForm.allergies}
              onChange={(e) =>
                setMedicalForm({ ...medicalForm, allergies: e.target.value })
              }
              rows={3}
            />
            <Textarea
              label="Medical Notes"
              value={medicalForm.medical_notes}
              onChange={(e) =>
                setMedicalForm({
                  ...medicalForm,
                  medical_notes: e.target.value,
                })
              }
              rows={3}
            />
          </div>
        </EditModal>
      )}

      {activeModal === "notes" && (
        <EditModal
          title="Edit Notes"
          onClose={() => setActiveModal(null)}
          onSave={() => handleSave("notes")}
          saving={saving}
        >
          <Textarea
            label="Notes"
            value={notesForm.notes}
            onChange={(e) =>
              setNotesForm({ ...notesForm, notes: e.target.value })
            }
            rows={6}
          />
        </EditModal>
      )}
    </div>
  );
}

// Reusable Components
function InfoCard({
  title,
  onEdit,
  items,
}: {
  title: string;
  onEdit: () => void;
  items: { label: string; value: any }[];
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Edit
        </button>
      </div>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{item.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface EditModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}

function EditModal({
  title,
  children,
  onClose,
  onSave,
  saving,
}: EditModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
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
        {children}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

function Input({ label, required, ...props }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

function Select({ label, options, ...props }: SelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

function Textarea({ label, ...props }: TextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      />
    </div>
  );
}
