import { describe, expect, it, vi, beforeEach } from "vitest";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/components/AppShell", () => ({ AppShell: () => null }));
import { Route } from "../routes/_authenticated/route";
import { isRedirect } from "@tanstack/react-router";

const checkSession = Route.options.beforeLoad as () => Promise<{ user: { id: string } }>;
beforeEach(() => vi.resetAllMocks());
describe("internal route session checks", () => {
  it("allows session-backed navigation without a network user lookup", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "reader-1" } } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: { id: "reader-1" } } });
    expect((await checkSession()).user.id).toBe("reader-1");
    expect((await checkSession()).user.id).toBe("reader-1");
    expect(auth.getUser).not.toHaveBeenCalled();
  });
  it("redirects signed-out visitors instead of allowing protected navigation", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await checkSession().catch((error: unknown) => error);
    expect(isRedirect(result)).toBe(true);
    expect(result).toHaveProperty("options.to", "/auth");
  });
  it("redirects when session loading fails", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error("Session unavailable") });
    auth.getUser.mockResolvedValue({ data: { user: { id: "reader-1" } } });
    const result = await checkSession().catch((error: unknown) => error);
    expect(isRedirect(result)).toBe(true);
  });
});