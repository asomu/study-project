import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

export const allowedImageMimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageMime = keyof typeof allowedImageMimeToExtension;

function normalizeRelativePath(pathValue: string) {
  return pathValue.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/+$/, "");
}

export function getUploadDirectory() {
  return normalizeRelativePath(process.env.UPLOAD_DIR ?? "public/uploads/wrong-answers");
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

function toPublicPath(uploadDir: string, fileName: string) {
  const normalized = normalizeRelativePath(uploadDir);

  if (normalized.startsWith("public/")) {
    return `/${normalized.slice("public/".length)}/${fileName}`;
  }

  return `/${normalized}/${fileName}`;
}

export async function saveWrongAnswerImage(file: File, wrongAnswerId: string) {
  const uploadDir = getUploadDirectory();
  const absoluteUploadDir = resolve(process.cwd(), uploadDir);
  const extension = allowedImageMimeToExtension[file.type as AllowedImageMime];
  const fileName = `${wrongAnswerId}-${Date.now()}-${randomUUID()}.${extension}`;
  const absolutePath = join(absoluteUploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(absoluteUploadDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return toPublicPath(uploadDir, fileName);
}
