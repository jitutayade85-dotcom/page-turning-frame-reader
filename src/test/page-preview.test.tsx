import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePagePreview } from "../hooks/use-page-preview";
import { defaultEdits } from "../lib/image";
import { previewCache } from "../lib/preview-cache";

vi.mock("../lib/preview-cache", async (original) => {
  const actual = await original<typeof import("../lib/preview-cache")>();
  return { ...actual, previewCache: { get: vi.fn() } };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("preview URL ownership", () => {
  it("does not rerender unchanged edits and revokes every owned URL on unmount", async () => {
    const get = vi.mocked(previewCache.get).mockResolvedValue([new Blob()]);
    const create = vi.fn().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
    const blob = new Blob();
    const hook = renderHook(({ edits }) => usePagePreview(blob, edits, 400), { initialProps: { edits: defaultEdits() } });
    await waitFor(() => expect(hook.result.current.urls).toEqual(["blob:first"]));
    const calls = get.mock.calls.length;
    hook.rerender({ edits: defaultEdits() });
    expect(get.mock.calls.length).toBe(calls);
    hook.rerender({ edits: { ...defaultEdits(), mode: "bw" } });
    await waitFor(() => expect(hook.result.current.urls).toEqual(["blob:second"]));
    expect(revoke).toHaveBeenCalledWith("blob:first");
    hook.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:second");
    vi.unstubAllGlobals();
  });
  it("never creates URLs for a render that finishes after unmount", async () => {
    let resolve: ((blobs: Blob[]) => void) | undefined;
    vi.mocked(previewCache.get).mockImplementation(() => new Promise((done) => { resolve = done; }));
    const create = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
    const hook = renderHook(() => usePagePreview(new Blob(), defaultEdits(), 400));
    await waitFor(() => expect(resolve).toBeDefined());
    hook.unmount();
    await act(async () => { resolve?.([new Blob()]); });
    expect(create).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});