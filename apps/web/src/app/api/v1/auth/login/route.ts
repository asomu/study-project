import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";
import { verifyPassword } from "@/modules/auth/password";
import { apiError } from "@/modules/shared/api-error";

const loginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
    });

    if (!user) {
      return apiError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password");
    }

    const passwordMatched = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!passwordMatched) {
      return apiError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password");
    }

    const accessToken = await signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
