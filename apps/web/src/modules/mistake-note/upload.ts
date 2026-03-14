import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

export const allowedImageMimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageMime = keyof typeof allowedImageMimeToExtension;

const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webpRiffSignature = Buffer.from("RIFF");
const webpFormatSignature = Buffer.from("WEBP");

function normalizeRelativePath(pathValue: string) {
  return pathValue.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/+$/, "");
}

export function getUploadDirectory() {
  return normalizeRelativePath(process.env.UPLOAD_DIR ?? "public/uploads/wrong-answers");
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

  return false;
}

function toPublicPath(uploadDir: string, fileName: string) {
  const normalized = normalizeRelativePath(uploadDir);

  if (normalized.startsWith("public/")) {
    return `/${normalized.slice("public/".length)}/${fileName}`;
  }

  return `/${normalized}/${fileName}`;
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

export async function saveStudyWorkArtifactImage(buffer: Buffer, attemptId: string) {
  const uploadDir = getStudyArtifactUploadDirectory();
  const absoluteUploadDir = resolve(process.cwd(), uploadDir);
  const fileName = `${attemptId}-${Date.now()}-${randomUUID()}.png`;
  const absolutePath = join(absoluteUploadDir, fileName);

  await mkdir(absoluteUploadDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return toPublicPath(uploadDir, fileName);
}
