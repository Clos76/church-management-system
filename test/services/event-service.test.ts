import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client");

import { createClient } from "@/lib/supabase/client";
import { EventService } from "@/lib/services/event-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[], user?: any) {
  mockCreateClient.mockReturnValue(makeMockClient(chains, user) as any);
  return new EventService();
}

const rawEvent = {
  id: "e-1",
  name: "Summer Camp",
  event_date: "2026-07-01T09:00:00",
  status: "open",
  capacity: 10,
  price: 100,
  registrations: [
    { id: "r-1", status: "paid" },
    { id: "r-2", status: "pending" },
  ],
};

describe("EventService.getEvents", () => {
  it("returns paginated events with computed stats", async () => {
    const service = makeService([makeChain({ data: [rawEvent], error: null, count: 1 })]);

    const result = await service.getEvents();

    expect(result.success).toBe(true);
    if (result.success) {
      const ev = result.data.items[0];
      expect(ev.registration_count).toBe(2);
      expect(ev.confirmed_count).toBe(1);      // only "paid" counts
      expect(ev.capacity_remaining).toBe(9);   // 10 - 1
      expect(result.data.total).toBe(1);
    }
  });

  it("capacity_remaining is null when event has no capacity", async () => {
    const service = makeService([
      makeChain({ data: [{ ...rawEvent, capacity: null, registrations: [] }], error: null, count: 1 }),
    ]);

    const result = await service.getEvents();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0].capacity_remaining).toBeNull();
  });

  it("returns success: false on query error", async () => {
    const service = makeService([makeChain({ data: null, error: { message: "DB error" } })]);

    const result = await service.getEvents();
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("EventService.getEventBySignupUrl", () => {
  it("returns a PublicEvent with registration counts", async () => {
    const service = makeService([
      makeChain({
        data: {
          id: "e-1",
          name: "Camp",
          description: null,
          event_date: "2026-07-01",
          end_date: null,
          location: "Beach",
          capacity: 20,
          price: 50,
          allow_partial_payment: false,
          status: "open",
          registrations: [{ id: "r-1", status: "confirmed" }],
        },
        error: null,
      }),
    ]);

    const result = await service.getEventBySignupUrl("summer-camp-2026");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registration_count).toBe(1);
      expect(result.data.capacity_remaining).toBe(19); // 20 - 1 confirmed
    }
  });

  it("returns success: false when event not found or not open", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "No rows found" } }),
    ]);

    const result = await service.getEventBySignupUrl("bad-url");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe("EventService.createEvent", () => {
  const newEvent = { id: "e-new", name: "Retreat", event_date: "2026-09-01", status: "draft" };

  it("creates event and returns it", async () => {
    const service = makeService([
      makeChain({ data: newEvent, error: null }), // insert
      makeChain({ data: null, error: null }),      // audit_log
    ]);

    const result = await service.createEvent({
      name: "Retreat",
      event_date: "2026-09-01",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("e-new");
  });

  it("returns success: false when not authenticated", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const result = await new EventService().createEvent({
      name: "Retreat",
      event_date: "2026-09-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not authenticated/i);
  });

  it("returns success: false when name or date is missing", async () => {
    const service = makeService([]);

    const result = await service.createEvent({ name: "", event_date: "" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("returns success: false when insert fails", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "insert error" } }),
    ]);

    const result = await service.createEvent({ name: "Camp", event_date: "2026-07-01" });
    expect(result.success).toBe(false);
  });
});

describe("EventService.deleteEvent", () => {
  it("deletes event when no registrations exist", async () => {
    const service = makeService([
      makeChain({ data: null, error: null, count: 0 }), // registrations count
      makeChain({ data: rawEvent, error: null }),         // get old data
      makeChain({ data: null, error: null }),             // delete
      makeChain({ data: null, error: null }),             // audit_log
    ]);

    const result = await service.deleteEvent("e-1");
    expect(result.success).toBe(true);
  });

  it("blocks deletion when registrations exist", async () => {
    const service = makeService([
      makeChain({ data: null, error: null, count: 3 }), // 3 registrations
    ]);

    const result = await service.deleteEvent("e-1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/registrations/i);
  });

  it("returns success: false when not authenticated", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const result = await new EventService().deleteEvent("e-1");
    expect(result.success).toBe(false);
  });
});
