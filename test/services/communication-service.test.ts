import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/events/event-bus", () => ({ eventBus: { emit: vi.fn() } }));

import { eventBus } from "@/lib/events/event-bus";
import { CommunicationService } from "@/lib/services/communication-service";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("CommunicationService.sendEmail", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(eventBus.emit).mockClear();
  });

  it("returns success: true and emits email.sent when API responds 200", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ resendId: "r-1" }) });
    const service = new CommunicationService();

    const result = await service.sendEmail({
      to: "pastor@church.com",
      subject: "Welcome",
      html: "<p>Hello</p>",
      profileId: "member-1",
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/communications/send",
      expect.objectContaining({ method: "POST" }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "email.sent",
        profileId: "member-1",
        subject: "Welcome",
      }),
    );
  });

  it("returns success: false when API responds with error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Invalid API key" }),
    });
    const service = new CommunicationService();

    const result = await service.sendEmail({
      to: "test@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid API key/i);
  });

  it("does not emit email.sent when no profileId is provided", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });
    const service = new CommunicationService();

    await service.sendEmail({ to: "anon@example.com", subject: "Hey", html: "<p>Hey</p>" });

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("returns success: false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const service = new CommunicationService();

    const result = await service.sendEmail({
      to: "test@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(result.success).toBe(false);
  });
});
