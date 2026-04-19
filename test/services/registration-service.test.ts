import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/events/event-bus", () => ({ eventBus: { emit: vi.fn() } }));

import { createClient } from "@/lib/supabase/client";
import { eventBus } from "@/lib/events/event-bus";
import { RegistrationService } from "@/lib/services/registration-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[]) {
  mockCreateClient.mockReturnValue(makeMockClient(chains) as any);
  return new RegistrationService();
}

const openEvent = { id: "e-1", name: "Camp", status: "open", capacity: null, registrations: [] };
const existingMember = { id: "member-1" };
const registration = { id: "reg-1", member_id: "member-1", event_id: "e-1", status: "pending" };

describe("RegistrationService.createPublicRegistration", () => {
  it("creates a registration and emits event.registered for a new member", async () => {
    const service = makeService([
      makeChain({ data: openEvent, error: null }),      // getEvent
      makeChain({ data: null, error: null }),            // findMemberByEmail → not found
      makeChain({ data: { id: "new-member-1" }, error: null }), // insertMember
      makeChain({ data: null, error: null }),            // existingReg check → none
      makeChain({ data: registration, error: null }),   // insertRegistration
    ]);
    vi.mocked(eventBus.emit).mockClear();

    const result = await service.createPublicRegistration({
      event_id: "e-1",
      first_name: "John",
      last_name: "Smith",
      email: "john@example.com",
      mobile_phone: "555-1234",
    });

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "event.registered", eventId: "e-1" }),
    );
  });

  it("matches an existing member by email", async () => {
    const service = makeService([
      makeChain({ data: openEvent, error: null }),
      makeChain({ data: existingMember, error: null }), // findMemberByEmail → found
      makeChain({ data: null, error: null }),            // updateEmergencyContact
      makeChain({ data: null, error: null }),            // existingReg check → none
      makeChain({ data: registration, error: null }),
    ]);

    const result = await service.createPublicRegistration({
      event_id: "e-1",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      mobile_phone: "555-9999",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.member_id).toBe("member-1");
  });

  it("returns success: false when event is not open", async () => {
    const service = makeService([
      makeChain({ data: { ...openEvent, status: "closed" }, error: null }),
    ]);

    const result = await service.createPublicRegistration({
      event_id: "e-1",
      first_name: "Bob",
      last_name: "Jones",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not accepting/i);
  });

  it("handles 23505 unique constraint violation as a duplicate registration", async () => {
    const service = makeService([
      makeChain({ data: openEvent, error: null }),
      makeChain({ data: null, error: null }),            // no existing member
      makeChain({ data: { id: "m-2" }, error: null }),   // insert member
      makeChain({ data: null, error: null }),            // existingReg check → none
      makeChain({ data: null, error: { code: "23505", message: "duplicate key" } }),
    ]);

    const result = await service.createPublicRegistration({
      event_id: "e-1",
      first_name: "Alice",
      last_name: "Brown",
      email: "alice@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already registered/i);
  });

  it("returns success: false when event is at capacity", async () => {
    const fullEvent = {
      ...openEvent,
      capacity: 1,
      registrations: [{ status: "confirmed" }],
    };
    const service = makeService([makeChain({ data: fullEvent, error: null })]);

    const result = await service.createPublicRegistration({
      event_id: "e-1",
      first_name: "Late",
      last_name: "Comer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/capacity/i);
  });
});
