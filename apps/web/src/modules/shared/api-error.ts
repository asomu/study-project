import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR";

export function apiError(status: number, code: ApiErrorCode, message: string, details: unknown[] = []) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
