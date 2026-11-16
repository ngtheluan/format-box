import { describe, expect, it } from "vitest";
import { slugifyLabel } from "@/lib/blog";
import { isAutoStalled } from "@/lib/blog-ai-shared";

describe("slugifyLabel", () => {
  it("strips Vietnamese diacritics", () => {
    expect(slugifyLabel("Công nghệ")).toBe("cong-nghe");
  });
  it("maps đ/Đ to d", () => {
    expect(slugifyLabel("Đồ ăn")).toBe("do-an");
  });
  it("collapses non-alphanumerics into single dash", () => {
    expect(slugifyLabel("Hello, World!!")).toBe("hello-world");
  });
  it("trims leading/trailing dashes", () => {
    expect(slugifyLabel("  ---hi---  ")).toBe("hi");
  });
  it("handles empty input", () => {
    expect(slugifyLabel("")).toBe("");
  });
});

describe("isAutoStalled", () => {
  const now = 1_000_000_000;
  it("not stalled when not running", () => {
    expect(isAutoStalled({ running: false, lastEventAt: now - 999_999 }, now)).toBe(false);
  });
  it("not stalled when lastEventAt is null", () => {
    expect(isAutoStalled({ running: true, lastEventAt: null }, now)).toBe(false);
  });
  it("not stalled within 3 minutes", () => {
    expect(isAutoStalled({ running: true, lastEventAt: now - 60_000 }, now)).toBe(false);
  });
  it("stalled past 3 minutes", () => {
    expect(isAutoStalled({ running: true, lastEventAt: now - 200_000 }, now)).toBe(true);
  });
  it("respects lockedUntil as the newer anchor", () => {
    expect(
      isAutoStalled({ running: true, lastEventAt: now - 999_999, lockedUntil: now - 60_000 }, now),
    ).toBe(false);
  });
});
