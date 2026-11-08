import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplashScreen } from "../components/SplashScreen";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("brief splash startup", () => {
  it("keeps the intro visible for 2.8 seconds and disappears after its smooth exit", () => {
    const view = render(<SplashScreen />);
    expect(view.queryByRole("button", { name: "Skip intro" })).not.toBeNull();
    act(() => vi.advanceTimersByTime(2799));
    expect(view.queryByRole("button", { name: "Skip intro" })?.className).not.toContain("opacity-0");
    act(() => vi.advanceTimersByTime(1));
    expect(view.queryByRole("button", { name: "Skip intro" })?.className).toContain("opacity-0");
    act(() => vi.advanceTimersByTime(200));
    expect(view.queryByRole("button", { name: "Skip intro" })).toBeNull();
  });
  it("does not delay returning users even in a new session", () => {
    const first = render(<SplashScreen />);
    first.unmount();
    sessionStorage.clear();
    const next = render(<SplashScreen />);
    expect(next.queryByRole("button", { name: "Skip intro" })).toBeNull();
  });
  it("allows skipping without waiting for the intro duration", () => {
    const view = render(<SplashScreen />);
    fireEvent.click(view.getByRole("button", { name: "Skip intro" }));
    act(() => vi.advanceTimersByTime(200));
    expect(view.queryByRole("button", { name: "Skip intro" })).toBeNull();
  });
});