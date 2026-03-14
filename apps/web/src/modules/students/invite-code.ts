import { createHash, randomBytes } from "node:crypto";

const INVITE_SEGMENT_LENGTH = 4;

export function createInviteCode() {
  const raw = randomBytes(6).toString("hex").toUpperCase();
  return `${raw.slice(0, INVITE_SEGMENT_LENGTH)}-${raw.slice(INVITE_SEGMENT_LENGTH, INVITE_SEGMENT_LENGTH * 2)}-${raw.slice(INVITE_SEGMENT_LENGTH * 2)}`;
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
