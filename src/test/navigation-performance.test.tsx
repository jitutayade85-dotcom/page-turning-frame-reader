import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), from: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks, from: mocks.from } }));
import { documentsQuery } from "../lib/documents";
import { useAuthUser } from "../hooks/use-auth";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("fast navigation", () => {
  it("reuses freshly loaded documents across page switches", async () => {
    const query = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue({ select: () => ({ order: query }) });
    const client = new QueryClient();
    await client.fetchQuery(documentsQuery);
    await client.fetchQuery(documentsQuery);
    expect(query).toHaveBeenCalledTimes(1);
    client.clear();
  });
  it("renders the current session without another user verification request", async () => {
    const user = { id: "reader-1" };
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    const { result } = renderHook(useAuthUser);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.id).toBe("reader-1");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("finishes loading when the auth session event arrives first", () => {
    let emit: ((event: string, session: null) => void) | undefined;
    mocks.getUser.mockReturnValue(new Promise(() => {}));
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    mocks.onAuthStateChange.mockImplementation((callback) => {
      emit = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const { result } = renderHook(useAuthUser);
    act(() => emit?.("INITIAL_SESSION", null));
    expect(result.current.loading).toBe(false);
  });
});