import { Buffer } from "node:buffer";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppBackupRoot,
  getAppDataRoot,
  getWrongNoteStorageRoot,
  hasValidImageSignature,
  isLegacyWrongNoteImagePath,
  isSupportedImageMime,
  resolveWrongNoteImageLocation,
} from "@/modules/mistake-note/upload";

function buildHeifHeader(brand: string) {
  return Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from("ftyp"), Buffer.from(brand), Buffer.alloc(4)]);
}

describe("mistake-note upload", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("resolves default macOS app data roots for wrong-note storage", () => {
    expect(getAppDataRoot()).toBe(resolve(homedir(), "Library", "Application Support", "study-project"));
    expect(getAppBackupRoot()).toBe(resolve(homedir(), "Library", "Application Support", "study-project-backups"));
    expect(getWrongNoteStorageRoot()).toBe(resolve(homedir(), "Library", "Application Support", "study-project", "wrong-notes"));
  });

  it("uses APP_DATA_ROOT to derive the repo-local wrong-note storage root for tests", () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-data");

    expect(getWrongNoteStorageRoot()).toBe(resolve(process.cwd(), ".tmp/test-data", "wrong-notes"));
  });

  it("recognizes legacy public upload paths and resolves them back into the repo public directory", () => {
    expect(isLegacyWrongNoteImagePath("/uploads/wrong-notes/note-1.png")).toBe(true);

    expect(resolveWrongNoteImageLocation("/uploads/wrong-notes/note-1.png")).toEqual({
      kind: "legacy",
      absolutePath: resolve(process.cwd(), "public", "uploads", "wrong-notes", "note-1.png"),
      storageKey: null,
    });
  });

  it("resolves storage keys under the external wrong-note storage root", () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-data");

    expect(resolveWrongNoteImageLocation("student-1/note-1/example.png")).toEqual({
      kind: "storage",
      absolutePath: resolve(process.cwd(), ".tmp/test-data", "wrong-notes", "student-1", "note-1", "example.png"),
      storageKey: "student-1/note-1/example.png",
    });
  });
});
