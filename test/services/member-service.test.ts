import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/events/event-bus", () => ({ eventBus: { emit: vi.fn() } }));

import { createClient } from "@/lib/supabase/client";
import { eventBus } from "@/lib/events/event-bus";
import { MemberService } from "@/lib/services/member-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[], user?: any) {
  mockCreateClient.mockReturnValue(makeMockClient(chains, user) as any);
  return new MemberService();
}

const member = {
  id: "m-1",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  member_status: "active",
};

describe("MemberService.getMembers", () => {
  it("returns paginated items on success", async () => {
    const service = makeService([makeChain({ data: [member], error: null, count: 1 })]);
    const result = await service.getMembers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(result.data.page).toBe(1);
    }
  });

  it("returns success: false when query errors", async () => {
    const service = makeService([makeChain({ data: null, error: { message: "DB error" } })]);
    const result = await service.getMembers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("MemberService.getMemberById", () => {
  it("returns the member on success", async () => {
    const service = makeService([makeChain({ data: member, error: null })]);
    const result = await service.getMemberById("m-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("m-1");
  });

  it("returns success: false when not found", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "No rows found" } }),
    ]);
    const result = await service.getMemberById("missing");

    expect(result.success).toBe(false);
  });
});

describe("MemberService.createMember", () => {
  it("returns the new member and emits member.created", async () => {
    const service = makeService([
      makeChain({ data: member, error: null }), // insert
      makeChain({ data: null, error: null }),    // audit_logs insert
    ]);

    const result = await service.createMember({
      first_name: "Jane",
      last_name: "Doe",
      member_status: "active",
    });

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "member.created", profileId: "m-1" }),
    );
  });

  it("returns success: false and does not emit when insert fails", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "insert failed" } }),
    ]);
    vi.mocked(eventBus.emit).mockClear();

    const result = await service.createMember({
      first_name: "Jane",
      last_name: "Doe",
      member_status: "visitor",
    });

    expect(result.success).toBe(false);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("returns success: false when not authenticated", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);
    const service = new MemberService();

    const result = await service.createMember({
      first_name: "Jane",
      last_name: "Doe",
      member_status: "visitor",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not authenticated/i);
  });
});

describe("MemberService.updateMember", () => {
  it("emits member.statusChanged when status changes", async () => {
    const service = makeService([
      makeChain({ data: { ...member, member_status: "visitor" }, error: null }), // select old
      makeChain({ data: { ...member, member_status: "active" }, error: null }),  // update
      makeChain({ data: null, error: null }),                                     // audit_logs
    ]);
    vi.mocked(eventBus.emit).mockClear();

    await service.updateMember({ id: "m-1", member_status: "active" });

    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "member.statusChanged", from: "visitor", to: "active" }),
    );
  });
});
