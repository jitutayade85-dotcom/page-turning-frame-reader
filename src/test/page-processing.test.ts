import { describe, expect, it } from "vitest";
import { cleanupMarginFingers, detectSpreadPixels, splitBounds } from "../lib/page-processing";

function paper(w: number, h: number) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([240, 238, 230, 255], i);
  return pixels;
}

describe("spread reading order", () => {
  it("splits left first and right second at the adjusted gutter without losing pixels", () => {
    expect(splitBounds(1000, true, 0.43)).toEqual([{ x: 0, width: 430 }, { x: 430, width: 570 }]);
  });
  it("keeps an unsplit page when splitting is disabled", () => {
    expect(splitBounds(1000, false, 0.43)).toEqual([{ x: 0, width: 1000 }]);
  });
  it("detects a dark center gutter on an open spread but not a portrait page", () => {
    const pixels = paper(200, 120);
    for (let y = 0; y < 120; y++) for (let x = 96; x < 104; x++) pixels.set([55, 55, 55, 255], (y * 200 + x) * 4);
    expect(detectSpreadPixels(pixels, 200, 120)).toEqual({ enabled: true, gutter: 0.5 });
    expect(detectSpreadPixels(paper(100, 150), 100, 150).enabled).toBe(false);
  });
});

describe("margin finger cleanup", () => {
  it("replaces an edge-connected thumb with sampled paper while retaining central skin and text", () => {
    const pixels = paper(100, 100);
    for (let y = 40; y < 60; y++) for (let x = 0; x < 8; x++) pixels.set([195, 115, 85, 255], (y * 100 + x) * 4);
    pixels.set([195, 115, 85, 255], (50 * 100 + 50) * 4);
    pixels.set([20, 20, 20, 255], (30 * 100 + 4) * 4);
    expect(cleanupMarginFingers(pixels, 100, 100)).toBe(160);
    expect([...pixels.slice((50 * 100 + 3) * 4, (50 * 100 + 3) * 4 + 4)]).toEqual([240, 238, 230, 255]);
    expect([...pixels.slice((50 * 100 + 50) * 4, (50 * 100 + 50) * 4 + 4)]).toEqual([195, 115, 85, 255]);
    expect([...pixels.slice((30 * 100 + 4) * 4, (30 * 100 + 4) * 4 + 4)]).toEqual([20, 20, 20, 255]);
  });
  it("leaves clean paper unchanged", () => {
    const pixels = paper(100, 100), before = pixels.slice();
    expect(cleanupMarginFingers(pixels, 100, 100)).toBe(0);
    expect(pixels).toEqual(before);
  });
});