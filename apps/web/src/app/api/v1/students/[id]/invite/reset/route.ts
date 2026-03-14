import { NextResponse } from "next/server";
import { OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { resetStudentInvite } from "@/modules/students/invite-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("student_invite_reset_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const { id } = await context.params;
    const result = await resetStudentInvite({
      studentId: id,
      guardianUserId: session.userId,
    });

    return NextResponse.json({
      studentId: result.student.id,
      studentName: result.student.name,
      inviteCode: result.inviteCode,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof OwnershipError) {
      return apiError(403, "FORBIDDEN", "Student ownership verification failed");
    }

    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
