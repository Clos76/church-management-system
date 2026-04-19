import type { Member } from "@/lib/types/member";

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "test-member-1",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    mobile_phone: "555-0100",
    member_status: "active",
    emergency_contact_name: null,
    emergency_contact_phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Member;
}
