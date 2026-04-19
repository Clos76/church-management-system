import { vi } from "vitest";

/**
 * Creates a fully chainable Supabase query builder mock that resolves to `result`.
 * Supports both `.single()` / `.maybeSingle()` termination and direct `await`.
 */
export function makeChain(result: { data?: any; error?: any; count?: number | null }) {
  const r = { data: result.data ?? null, error: result.error ?? null, count: result.count ?? null };

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(r),
    maybeSingle: vi.fn().mockResolvedValue(r),
    // Make directly awaitable
    then: (res: any, rej: any) => Promise.resolve(r).then(res, rej),
    catch: (fn: any) => Promise.resolve(r).catch(fn),
    finally: (fn: any) => Promise.resolve(r).finally(fn),
  };

  return chain;
}

/** Build a mock Supabase client. Pass `chains` in the order `from()` will be called. */
export function makeMockClient(chains: ReturnType<typeof makeChain>[], userOverride?: any) {
  const mockFrom = vi.fn();
  chains.forEach((c) => mockFrom.mockReturnValueOnce(c));
  // Fallback for unexpected extra calls
  mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userOverride ?? { id: "actor-id-1" } },
        error: null,
      }),
    },
  };
}
