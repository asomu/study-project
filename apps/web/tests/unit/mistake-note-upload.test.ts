import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { hasValidImageSignature, isSupportedImageMime } from "@/modules/mistake-note/upload";

function buildHeifHeader(brand: string) {
  return Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from("ftyp"), Buffer.from(brand), Buffer.alloc(4)]);
}

describe("mistake-note upload", () => {
  it("accepts heic and heif mime types for iPad photo uploads", () => {
    expect(isSupportedImageMime("image/heic")).toBe(true);
    expect(isSupportedImageMime("image/heif")).toBe(true);
  });

  it("validates heic/heif file signatures from ISO base media headers", () => {
    expect(hasValidImageSignature("image/heic", buildHeifHeader("heic"))).toBe(true);
    expect(hasValidImageSignature("image/heif", buildHeifHeader("mif1"))).toBe(true);
  });

  it("rejects heic files when the signature does not match the declared type", () => {
    expect(hasValidImageSignature("image/heic", Buffer.from("not-a-real-heic"))).toBe(false);
  });
});
