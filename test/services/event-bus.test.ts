import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus } from "@/lib/events/event-bus";

// Reset handlers between tests by re-importing a fresh instance
// The module is cached, so we test the singleton directly but clear per-test

describe("DomainEventBus", () => {
  it("calls a registered handler when its event type is emitted", async () => {
    const handler = vi.fn();
    eventBus.on("member.created", handler);
    eventBus.emit({ type: "member.created", profileId: "p-1", status: "visitor" });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(handler).toHaveBeenCalledWith({
      type: "member.created",
      profileId: "p-1",
      status: "visitor",
    });
  });

  it("does not call a handler registered for a different event type", async () => {
    const handler = vi.fn();
    eventBus.on("task.completed", handler);
    eventBus.emit({ type: "member.created", profileId: "p-2", status: "active" });

    await new Promise((r) => setTimeout(r, 10));
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls multiple handlers for the same event type", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.on("email.sent", h1);
    eventBus.on("email.sent", h2);
    eventBus.emit({ type: "email.sent", profileId: "p-3", subject: "Hello" });

    await vi.waitFor(() => {
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });
  });

  it("isolates handler errors so other handlers still run", async () => {
    const bad = vi.fn().mockRejectedValue(new Error("boom"));
    const good = vi.fn();
    eventBus.on("donation.completed", bad);
    eventBus.on("donation.completed", good);
    eventBus.emit({ type: "donation.completed", profileId: "p-4", amount: 50, fundId: "f-1" });

    await vi.waitFor(() => expect(good).toHaveBeenCalledTimes(1));
  });

  it("emit is fire-and-forget — does not throw on handler error", () => {
    eventBus.on("group.joined", vi.fn().mockRejectedValue(new Error("crash")));
    expect(() =>
      eventBus.emit({ type: "group.joined", profileId: "p-5", groupId: "g-1" }),
    ).not.toThrow();
  });
});
