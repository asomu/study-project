import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { parseDateOnly } from "@/modules/dashboard/date-range";
import {
  allowedImageMimeToExtension,
  getUploadMaxBytes,
  hasValidImageSignature,
  isSupportedImageMime,
  saveWrongNoteImage,
  supportedImageMimeDescription,
} from "@/modules/mistake-note/upload";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUploadFailure } from "@/modules/shared/structured-log";
import { serializeWrongNote, serializeWrongNoteList, serializeWrongNoteStudent, wrongNoteInclude } from "@/modules/wrong-note/serializers";
import {
  buildWrongNotePagination,
  buildWrongNoteWhere,
  getWrongNoteCurriculumNodeWhere,
  normalizeOptionalText,
} from "@/modules/wrong-note/service";
import { createWrongNoteSchema, parseStudentWrongNoteListQuery } from "@/modules/wrong-note/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_notes_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseStudentWrongNoteListQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const from = parsed.data.from ? parseDateOnly(parsed.data.from) : null;
    const to = parsed.data.to ? parseDateOnly(parsed.data.to) : null;

    if ((parsed.data.from && !from) || (parsed.data.to && !to)) {
      return apiError(400, "VALIDATION_ERROR", "from/to must be valid date strings");
    }

    if (from && to && from > to) {
      return apiError(400, "VALIDATION_ERROR", "from must be before or equal to to");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const where = buildWrongNoteWhere({
        studentId: student.id,
        semester: parsed.data.semester,
        curriculumNodeId: parsed.data.curriculumNodeId,
        reason: parsed.data.reason,
        from,
        to,
        hasFeedback: parsed.data.hasFeedback ? parsed.data.hasFeedback === "true" : undefined,
      });
      const page = parsed.data.page;
      const pageSize = parsed.data.pageSize;
      const [totalItems, wrongNotes] = await Promise.all([
        prisma.wrongNote.count({ where }),
        prisma.wrongNote.findMany({
          where,
          include: wrongNoteInclude,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return NextResponse.json(
        serializeWrongNoteList({
          student: serializeWrongNoteStudent({
            id: student.id,
            name: student.name,
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          }),
          pagination: buildWrongNotePagination(page, pageSize, totalItems),
          wrongNotes: wrongNotes.map(serializeWrongNote),
        }),
      );
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Student profile linkage verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_create_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const formData = await request.formData();
      const fileCandidate = formData.get("file");

      if (!(fileCandidate instanceof File)) {
        logUploadFailure("wrong_note_missing_file", {
          userId: session.userId,
        });
        return apiError(400, "VALIDATION_ERROR", "file field is required");
      }

      const parsed = createWrongNoteSchema.safeParse({
        curriculumNodeId: formData.get("curriculumNodeId"),
        semester: formData.get("semester"),
        reason: formData.get("reason"),
        studentMemo: formData.get("studentMemo") ?? undefined,
      });

      if (!parsed.success) {
        return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
      }

      const curriculumNode = await prisma.curriculumNode.findFirst({
        where: getWrongNoteCurriculumNodeWhere({
          student: {
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          },
          curriculumNodeId: parsed.data.curriculumNodeId,
          semester: parsed.data.semester,
        }),
      });

      if (!curriculumNode) {
        return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is not available for the student and semester");
      }

      if (!isSupportedImageMime(fileCandidate.type)) {
        logUploadFailure("wrong_note_unsupported_mime_type", {
          userId: session.userId,
          mimeType: fileCandidate.type,
        });
        return apiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          `Only ${supportedImageMimeDescription} images are allowed`,
          Object.keys(allowedImageMimeToExtension),
        );
      }

      const maxBytes = getUploadMaxBytes();

      if (fileCandidate.size > maxBytes) {
        logUploadFailure("wrong_note_payload_too_large", {
          userId: session.userId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
          maxBytes,
        });
        return apiError(413, "PAYLOAD_TOO_LARGE", `File exceeds ${maxBytes} bytes limit`);
      }

      const fileBuffer = Buffer.from(await fileCandidate.arrayBuffer());

      if (!hasValidImageSignature(fileCandidate.type, fileBuffer)) {
        logUploadFailure("wrong_note_invalid_file_signature", {
          userId: session.userId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
        });
        return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "File signature does not match declared image type");
      }

      const wrongNoteId = randomUUID();
      const imagePath = await saveWrongNoteImage(fileBuffer, fileCandidate.type, wrongNoteId);
      const wrongNote = await prisma.wrongNote.create({
        data: {
          id: wrongNoteId,
          studentId: student.id,
          curriculumNodeId: curriculumNode.id,
          reason: parsed.data.reason,
          imagePath,
          studentMemo: normalizeOptionalText(parsed.data.studentMemo),
        },
        include: wrongNoteInclude,
      });

      return NextResponse.json(serializeWrongNote(wrongNote), {
        status: 201,
      });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Student profile linkage verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
