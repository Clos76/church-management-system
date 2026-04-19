import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/events/event-bus", () => ({ eventBus: { emit: vi.fn() } }));

import { createClient } from "@/lib/supabase/client";
import { eventBus } from "@/lib/events/event-bus";
import { PaymentService } from "@/lib/services/payment-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[], user?: any) {
  mockCreateClient.mockReturnValue(makeMockClient(chains, user) as any);
  return new PaymentService();
}

// A registration with $100 event price, $0 paid so far
const registration = {
  id: "reg-1",
  member_id: "member-1",
  event_id: "e-1",
  status: "pending",
  events: { price: 100 },
  payments: [],
};

const payment = {
  id: "pay-1",
  registration_id: "reg-1",
  amount: 100,
  method: "cash",
  stripe_payment_intent_id: null,
};

describe("PaymentService.recordManualPayment", () => {
  beforeEach(() => vi.mocked(eventBus.emit).mockClear());

  it("records a payment, updates registration to paid, and emits donation.completed", async () => {
    const service = makeService([
      makeChain({ data: registration, error: null }), // get registration
      makeChain({ data: payment, error: null }),       // insert payment
      makeChain({ data: null, error: null }),           // update registration status
      makeChain({ data: null, error: null }),           // audit_log
    ]);

    const result = await service.recordManualPayment({
      registration_id: "reg-1",
      amount: 100,
      method: "cash",
    });

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "donation.completed",
        profileId: "member-1",
        amount: 100,
      }),
    );
  });

  it("sets status to partial when payment is less than full price", async () => {
    const partialReg = { ...registration, payments: [] };
    const partialChain = makeChain({ data: partialReg, error: null });
    const updateChain = makeChain({ data: null, error: null });

    // Capture the update call to verify status
    const mockFrom = vi.fn()
      .mockReturnValueOnce(partialChain)                              // get registration
      .mockReturnValueOnce(makeChain({ data: { ...payment, amount: 40 }, error: null })) // insert payment
      .mockReturnValueOnce(updateChain)                               // update registration
      .mockReturnValue(makeChain({ data: null, error: null }));       // audit_log

    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } } }) },
    } as any);

    const service = new PaymentService();
    const result = await service.recordManualPayment({
      registration_id: "reg-1",
      amount: 40,
      method: "check",
    });

    expect(result.success).toBe(true);
    // The update chain should have been called with status: "partial"
    expect(updateChain.update).toHaveBeenCalledWith({ status: "partial" });
  });

  it("returns success: false for zero or negative amount", async () => {
    const service = makeService([]);

    const result = await service.recordManualPayment({
      registration_id: "reg-1",
      amount: 0,
      method: "cash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/greater than 0/i);
  });

  it("returns success: false when registration not found", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "No rows" } }),
    ]);

    const result = await service.recordManualPayment({
      registration_id: "bad-id",
      amount: 50,
      method: "cash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns success: false when not authenticated", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const result = await new PaymentService().recordManualPayment({
      registration_id: "reg-1",
      amount: 50,
      method: "cash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not authenticated/i);
  });
});

describe("PaymentService.processStripePayment", () => {
  it("is idempotent — returns early if payment already exists", async () => {
    const service = makeService([
      makeChain({ data: { id: "pay-existing" }, error: null }), // existing payment found
    ]);

    const result = await service.processStripePayment("reg-1", "pi_existing", 100);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already processed/i);
  });

  it("creates a payment record when intent is new", async () => {
    const service = makeService([
      makeChain({ data: null, error: null }),          // no existing payment
      makeChain({ data: registration, error: null }),  // get registration
      makeChain({ data: payment, error: null }),        // insert payment
      makeChain({ data: null, error: null }),           // update registration status
    ]);

    const result = await service.processStripePayment("reg-1", "pi_new_123", 100);
    expect(result.success).toBe(true);
  });
});

describe("PaymentService.deletePayment", () => {
  it("blocks deletion of Stripe payments", async () => {
    const stripePayment = { ...payment, stripe_payment_intent_id: "pi_abc", registration_id: "reg-1" };
    const service = makeService([makeChain({ data: stripePayment, error: null })]);

    const result = await service.deletePayment("pay-1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Stripe/i);
  });

  it("deletes a manual payment and recalculates registration status", async () => {
    const manualPayment = {
      ...payment,
      stripe_payment_intent_id: null,
      registration_id: "reg-1",
      registrations: { id: "reg-1", events: { price: 100 }, payments: [{ amount: "100" }] },
    };
    const service = makeService([
      makeChain({ data: manualPayment, error: null }), // get payment
      makeChain({ data: null, error: null }),           // delete
      makeChain({ data: { events: { price: 100 }, payments: [] }, error: null }), // recalculate
      makeChain({ data: null, error: null }),           // update status
      makeChain({ data: null, error: null }),           // audit_log
    ]);

    const result = await service.deletePayment("pay-1");
    expect(result.success).toBe(true);
  });
});
