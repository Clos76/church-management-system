import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server");

import { createClient } from "@/lib/supabase/server";
import { PATCH } from "@/app/api/users/[id]/route";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeRequest(body: object, userId = "user-id-1") {
  return new Request(`http://localhost/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupClient(chains: ReturnType<typeof makeChain>[], user: any) {
  mockCreateClient.mockResolvedValue(makeMockClient(chains, user) as any);
}

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no session user", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await PATCH(makeRequest({ role: "event_leader" }), {
      params: Promise.resolve({ id: "target-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when requester is not admin", async () => {
    setupClient(
      [makeChain({ data: { role: "event_leader" }, error: null })],
      { id: "requester-1" },
    );

    const res = await PATCH(makeRequest({ role: "admin" }), {
      params: Promise.resolve({ id: "target-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when role value is invalid", async () => {
    setupClient(
      [makeChain({ data: { role: "admin" }, error: null })],
      { id: "requester-1" },
    );

    const res = await PATCH(makeRequest({ role: "superuser" }), {
      params: Promise.resolve({ id: "target-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 200 when requester is admin and role is valid", async () => {
    setupClient(
      [
        makeChain({ data: { role: "admin" }, error: null }),          // requester profile
        makeChain({ data: { role: "member" }, error: null }),          // target old role
        makeChain({ data: null, error: null }),                         // update profiles
        makeChain({ data: null, error: null }),                         // audit_logs insert
      ],
      { id: "requester-1" },
    );

    const res = await PATCH(makeRequest({ role: "event_leader" }), {
      params: Promise.resolve({ id: "target-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when role field is missing from request body", async () => {
    setupClient(
      [makeChain({ data: { role: "admin" }, error: null })],
      { id: "requester-1" },
    );

    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: "target-1" }),
    });

    expect(res.status).toBe(400);
  });
});
