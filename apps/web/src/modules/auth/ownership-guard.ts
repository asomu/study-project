import type { Prisma, Student } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logOwnershipDenied } from "@/modules/shared/structured-log";

export class OwnershipError extends Error {
  constructor(message = "Requested resource does not belong to authenticated guardian") {
    super(message);
    this.name = "OwnershipError";
  }
}

type BaseOwnershipParams = {
  guardianUserId: string;
  tx?: Prisma.TransactionClient;
};

type StudentOwnershipParams = BaseOwnershipParams & {
  studentId: string;
};

type StudentLoginOwnershipParams = {
  loginUserId: string;
  tx?: Prisma.TransactionClient;
};

function getClient(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export async function getOwnedStudent({ studentId, guardianUserId, tx }: StudentOwnershipParams) {
  const client = getClient(tx);

  return client.student.findFirst({
    where: {
      id: studentId,
      guardianUserId,
    },
  });
}

export async function assertStudentOwnership(params: StudentOwnershipParams): Promise<Student> {
  const student = await getOwnedStudent(params);

  if (!student) {
    logOwnershipDenied("student", params.studentId, params.guardianUserId);
    throw new OwnershipError("Requested student does not belong to authenticated guardian");
  }

  return student;
}

export async function getStudentForLogin({ loginUserId, tx }: StudentLoginOwnershipParams) {
  const client = getClient(tx);

  return client.student.findFirst({
    where: {
      loginUserId,
    },
  });
}

export async function assertStudentLoginOwnership(params: StudentLoginOwnershipParams): Promise<Student> {
  const student = await getStudentForLogin(params);

  if (!student) {
    throw new OwnershipError("Authenticated student account is not linked to a student profile");
  }

  return student;
}
