import { vi } from "vitest";

// Stub Next.js server-only modules that aren't available in jsdom
vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({})),
}));
