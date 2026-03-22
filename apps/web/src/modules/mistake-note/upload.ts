import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { logStorageInfo } from "@/modules/shared/structured-log";

export const allowedImageMimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
} as const;

export type AllowedImageMime = keyof typeof allowedImageMimeToExtension;
export const supportedImageMimeDescription = "jpeg, png, webp, heic, and heif";

const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webpRiffSignature = Buffer.from("RIFF");
const webpFormatSignature = Buffer.from("WEBP");
const heifBoxTypeSignature = Buffer.from("ftyp");
const heifBrands = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);
const wrongNoteLegacyPublicPrefix = "/uploads/wrong-notes/";
const defaultAppDataRootSegments = ["Library", "Application Support", "study-project"];
const defaultAppBackupRootSegments = ["Library", "Application Support", "study-project-backups"];
let hasLoggedWrongNoteStorageInfo = false;

function normalizeRelativePath(pathValue: string) {
  return pathValue.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/+$/, "");
}

export function getUploadDirectory() {
  return normalizeRelativePath(process.env.UPLOAD_DIR ?? "public/uploads/wrong-answers");
}

function expandConfiguredPath(pathValue: string) {
  const trimmed = pathValue.trim();

  if (trimmed.startsWith("~/")) {
    return resolve(homedir(), trimmed.slice(2));
  }

  if (isAbsolute(trimmed)) {
    return resolve(trimmed);
  }

  return resolve(process.cwd(), trimmed);
}

function toDefaultAppDataRoot() {
  return resolve(homedir(), ...defaultAppDataRootSegments);
}

function toDefaultAppBackupRoot() {
  return resolve(homedir(), ...defaultAppBackupRootSegments);
}

export function getAppDataRoot() {
  const configured = process.env.APP_DATA_ROOT;

  if (!configured || !configured.trim()) {
    return toDefaultAppDataRoot();
  }

  return expandConfiguredPath(configured);
}

export function getAppBackupRoot() {
  const configured = process.env.APP_BACKUP_ROOT;

  if (!configured || !configured.trim()) {
    return toDefaultAppBackupRoot();
  }

  return expandConfiguredPath(configured);
}

export function getWrongNoteStorageRoot() {
  const configured = process.env.WRONG_NOTE_STORAGE_ROOT;

  if (configured && configured.trim()) {
    return expandConfiguredPath(configured);
  }

  return resolve(getAppDataRoot(), "wrong-notes");
}

function logWrongNoteStorageInfoOnce() {
  if (hasLoggedWrongNoteStorageInfo) {
    return;
  }

  hasLoggedWrongNoteStorageInfo = true;
  logStorageInfo("wrong_note_storage_root_resolved", {
    appDataRoot: getAppDataRoot(),
    wrongNoteStorageRoot: getWrongNoteStorageRoot(),
    appBackupRoot: getAppBackupRoot(),
  });
}

export function getStudyArtifactUploadDirectory() {
  return normalizeRelativePath(process.env.STUDY_UPLOAD_DIR ?? "public/uploads/study-work");
}

export function getUploadMaxBytes() {
  const configured = Number(process.env.UPLOAD_MAX_BYTES);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 5 * 1024 * 1024;
  }

  return configured;
}

export function isSupportedImageMime(mimeType: string): mimeType is AllowedImageMime {
  return mimeType in allowedImageMimeToExtension;
}

export function hasValidImageSignature(mimeType: AllowedImageMime, buffer: Buffer) {
  if (mimeType === "image/jpeg") {
    return buffer.subarray(0, jpegSignature.length).equals(jpegSignature);
  }

  if (mimeType === "image/png") {
    return buffer.subarray(0, pngSignature.length).equals(pngSignature);
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, webpRiffSignature.length).equals(webpRiffSignature) &&
      buffer.subarray(8, 12).equals(webpFormatSignature)
    );
  }

  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).equals(heifBoxTypeSignature) &&
      heifBrands.has(buffer.subarray(8, 12).toString("ascii"))
    );
  }

  return false;
}

function toPublicPath(uploadDir: string, fileName: string) {
  const normalized = normalizeRelativePath(uploadDir);

  if (normalized.startsWith("public/")) {
    return `/${normalized.slice("public/".length)}/${fileName}`;
  }

  return `/${normalized}/${fileName}`;
}

function toSafeWrongNoteStorageKey(storageKey: string) {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return null;
  }

  return parts.join("/");
}

function toLegacyWrongNoteAbsolutePath(imagePath: string) {
  if (imagePath.startsWith(wrongNoteLegacyPublicPrefix)) {
    return resolve(process.cwd(), "public", imagePath.slice(1));
  }

  return resolve(process.cwd(), normalizeRelativePath(imagePath));
}

function toMimeTypeFromPath(pathValue: string): AllowedImageMime {
  const extension = extname(pathValue).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".heic") {
    return "image/heic";
  }

  if (extension === ".heif") {
    return "image/heif";
  }

  return "image/png";
}

export function isLegacyWrongNoteImagePath(imagePath: string) {
  return imagePath.startsWith(wrongNoteLegacyPublicPrefix) || imagePath.startsWith("uploads/wrong-notes/") || imagePath.startsWith("public/uploads/wrong-notes/");
}

export function buildStudentWrongNoteImageUrl(wrongNoteId: string) {
  return `/api/v1/student/wrong-notes/${wrongNoteId}/image`;
}

export function buildGuardianWrongNoteImageUrl(wrongNoteId: string, studentId: string) {
  return `/api/v1/wrong-notes/${wrongNoteId}/image?${new URLSearchParams({ studentId }).toString()}`;
}

export function resolveWrongNoteImageLocation(imagePath: string) {
  logWrongNoteStorageInfoOnce();

  if (isLegacyWrongNoteImagePath(imagePath)) {
    return {
      kind: "legacy" as const,
      absolutePath: toLegacyWrongNoteAbsolutePath(imagePath),
      storageKey: null,
    };
  }

  const storageKey = toSafeWrongNoteStorageKey(imagePath);

  if (!storageKey) {
    return null;
  }

  return {
    kind: "storage" as const,
    absolutePath: resolve(getWrongNoteStorageRoot(), storageKey),
    storageKey,
  };
}

export async function readWrongNoteImageFile(imagePath: string) {
  const resolved = resolveWrongNoteImageLocation(imagePath);

  if (!resolved) {
    return null;
  }

  try {
    const buffer = await readFile(resolved.absolutePath);

    return {
      buffer,
      contentType: toMimeTypeFromPath(resolved.absolutePath),
      ...resolved,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveWrongAnswerImage(buffer: Buffer, mimeType: AllowedImageMime, wrongAnswerId: string) {
  const uploadDir = getUploadDirectory();
  const absoluteUploadDir = resolve(process.cwd(), uploadDir);
  const extension = allowedImageMimeToExtension[mimeType];
  const fileName = `${wrongAnswerId}-${Date.now()}-${randomUUID()}.${extension}`;
  const absolutePath = join(absoluteUploadDir, fileName);

  await mkdir(absoluteUploadDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return toPublicPath(uploadDir, fileName);
}

export function buildWrongNoteStorageKey(studentId: string, wrongNoteId: string, mimeType: AllowedImageMime) {
  const extension = allowedImageMimeToExtension[mimeType];
  return `${studentId}/${wrongNoteId}/${Date.now()}-${randomUUID()}.${extension}`;
}

export async function saveWrongNoteImage(buffer: Buffer, mimeType: AllowedImageMime, studentId: string, wrongNoteId: string) {
  logWrongNoteStorageInfoOnce();

  const storageKey = buildWrongNoteStorageKey(studentId, wrongNoteId, mimeType);
  const absolutePath = resolve(getWrongNoteStorageRoot(), storageKey);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return storageKey;
}

export async function saveStudyWorkArtifactImage(buffer: Buffer, attemptId: string) {
  const uploadDir = getStudyArtifactUploadDirectory();
  const absoluteUploadDir = resolve(process.cwd(), uploadDir);
  const fileName = `${attemptId}-${Date.now()}-${randomUUID()}.png`;
  const absolutePath = join(absoluteUploadDir, fileName);

  await mkdir(absoluteUploadDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return toPublicPath(uploadDir, fileName);
}
