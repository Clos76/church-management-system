import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client");

import { createClient } from "@/lib/supabase/client";
import { TimelineService } from "@/lib/services/timeline-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[]) {
  mockCreateClient.mockReturnValue(makeMockClient(chains) as any);
  return new TimelineService();
}

const entry1 = {
  id: "log-1",
  profile_id: "member-1",
  actor_id: "actor-1",
  event_type: "member.created",
  metadata: { status: "visitor" },
  created_at: "2026-04-17T10:00:00Z",
};

const entry2 = {
  id: "log-2",
  profile_id: "member-1",
  actor_id: null,
  event_type: "event.registered",
  metadata: { eventId: "e-1" },
  created_at: "2026-04-18T10:00:00Z",
};

describe("TimelineService.addEntry", () => {
  it("inserts an activity_logs row without throwing", async () => {
    const mockFrom = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
    mockCreateClient.mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn() } } as any);
    const service = new TimelineService();

    await expect(
      service.addEntry({
        profile_id: "member-1",
        event_type: "member.created",
        metadata: { status: "visitor" },
      }),
    ).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith("activity_logs");
  });

  it("silently swallows DB errors — does not throw", async () => {
    const mockFrom = vi.fn().mockReturnValue(makeChain({ data: null, error: { message: "DB down" } }));
    mockCreateClient.mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn() } } as any);
    const service = new TimelineService();

    await expect(
      service.addEntry({ profile_id: "member-1", event_type: "task.completed" }),
    ).resolves.toBeUndefined();
  });

  it("defaults actor_id to null and metadata to empty object when omitted", async () => {
    const chain = makeChain({ data: null, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    mockCreateClient.mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn() } } as any);
    const service = new TimelineService();

    await service.addEntry({ profile_id: "member-1", event_type: "email.sent" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_id: null, metadata: {} }),
    );
  });
});

describe("TimelineService.getTimeline", () => {
  it("returns paginated entries ordered by created_at desc", async () => {
    const service = makeService([
      makeChain({ data: [entry2, entry1], error: null, count: 2 }),
    ]);

    const result = await service.getTimeline("member-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].id).toBe("log-2"); // most recent first
      expect(result.data.total).toBe(2);
      expect(result.data.page).toBe(1);
    }
  });

  it("respects page and pageSize options", async () => {
    const service = makeService([
      makeChain({ data: [entry1], error: null, count: 10 }),
    ]);

    const result = await service.getTimeline("member-1", { page: 2, pageSize: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(5);
      expect(result.data.total).toBe(10);
    }
  });

  it("returns empty items array when no entries exist", async () => {
    const service = makeService([makeChain({ data: [], error: null, count: 0 })]);

    const result = await service.getTimeline("member-new");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.total).toBe(0);
    }
  });

  it("returns success: false on query error", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "permission denied" } }),
    ]);

    const result = await service.getTimeline("member-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("permission denied");
  });
});
