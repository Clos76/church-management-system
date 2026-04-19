import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server");

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/communications/send/route";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function makeRequest(body: object) {
  return new Request("http://localhost/api/communications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAdmin() {
  mockCreateClient.mockResolvedValue(
    makeMockClient(
      [
        makeChain({ data: { role: "admin" }, error: null }), // profile check
        makeChain({ data: null, error: null }),               // email_logs insert
      ],
      { id: "admin-1" },
    ) as any,
  );
}

describe("POST /api/communications/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    delete process.env.RESEND_API_KEY;
  });

  it("returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST(makeRequest({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin or event_leader", async () => {
    mockCreateClient.mockResolvedValue(
      makeMockClient(
        [makeChain({ data: { role: "member" }, error: null })],
        { id: "member-1" },
      ) as any,
    );

    const res = await POST(makeRequest({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    setupAdmin();

    const res = await POST(makeRequest({ to: "a@b.com" })); // missing subject + html
    expect(res.status).toBe(400);
  });

  it("returns 200 with status:skipped when RESEND_API_KEY is not set", async () => {
    setupAdmin();

    const res = await POST(
      makeRequest({ to: "pastor@church.com", subject: "Welcome", html: "<p>Hi</p>" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // fetch should NOT have been called for the Resend API
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 200 and calls Resend when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockCreateClient.mockResolvedValue(
      makeMockClient(
        [
          makeChain({ data: { role: "admin" }, error: null }),
          makeChain({ data: null, error: null }),
        ],
        { id: "admin-1" },
      ) as any,
    );
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "resend-id-1" }),
    });

    const res = await POST(
      makeRequest({ to: "pastor@church.com", subject: "Welcome", html: "<p>Hi</p>" }),
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns 502 when Resend API returns an error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockCreateClient.mockResolvedValue(
      makeMockClient(
        [
          makeChain({ data: { role: "admin" }, error: null }),
          makeChain({ data: null, error: null }),
        ],
        { id: "admin-1" },
      ) as any,
    );
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: "API key invalid" }),
    });

    const res = await POST(
      makeRequest({ to: "pastor@church.com", subject: "Welcome", html: "<p>Hi</p>" }),
    );

    expect(res.status).toBe(502);
  });
});
