import { describe, expect, it } from "vitest";
import { errMessage, errName } from "@/lib/errors";

describe("errMessage", () => {
  it("returns Error.message", () => {
    expect(errMessage(new Error("boom"))).toBe("boom");
  });
  it("falls back when Error has empty message", () => {
    expect(errMessage(new Error(""), "fallback")).toBe("fallback");
  });
  it("returns string as-is", () => {
    expect(errMessage("oops")).toBe("oops");
  });
  it("reads .message from plain object", () => {
    expect(errMessage({ message: "nope" })).toBe("nope");
  });
  it("uses fallback for unknowns", () => {
    expect(errMessage(null, "x")).toBe("x");
    expect(errMessage(undefined, "x")).toBe("x");
    expect(errMessage(42, "x")).toBe("x");
  });
  it("default fallback is 'Lỗi'", () => {
    expect(errMessage(null)).toBe("Lỗi");
  });
});

describe("errName", () => {
  it("returns Error.name", () => {
    const e = new Error("x");
    e.name = "AbortError";
    expect(errName(e)).toBe("AbortError");
  });
  it("reads name from plain object", () => {
    expect(errName({ name: "Custom" })).toBe("Custom");
  });
  it("returns undefined for non-errors", () => {
    expect(errName("str")).toBeUndefined();
    expect(errName(null)).toBeUndefined();
  });
});
