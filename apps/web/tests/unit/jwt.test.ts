import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { signAuthToken, verifyAuthToken } from "@/modules/auth/jwt";

describe("JWT auth helpers", () => {
  it("signs and verifies token payload", async () => {
    const token = await signAuthToken({
      sub: "guardian-1",
      role: UserRole.guardian,
      email: "guardian@example.com",
    });

    const payload = await verifyAuthToken(token);

    expect(payload).toEqual({
      sub: "guardian-1",
      role: UserRole.guardian,
      email: "guardian@example.com",
    });
  });

  it("returns null for malformed token", async () => {
    const payload = await verifyAuthToken("invalid-token");

    expect(payload).toBeNull();
  });
});
