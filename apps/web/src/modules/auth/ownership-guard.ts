import type { Prisma, Student } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class OwnershipError extends Error {
  constructor(message = "Requested student does not belong to authenticated guardian") {
    super(message);
    this.name = "OwnershipError";
  }
}

type OwnershipParams = {
  studentId: string;
  guardianUserId: string;
  tx?: Prisma.TransactionClient;
};

export async function getOwnedStudent({ studentId, guardianUserId, tx }: OwnershipParams) {
  const client = tx ?? prisma;

  return client.student.findFirst({
    where: {
      id: studentId,
      guardianUserId,
    },
  });
}

export async function assertStudentOwnership(params: OwnershipParams): Promise<Student> {
  const student = await getOwnedStudent(params);

  if (!student) {
    throw new OwnershipError();
  }

  return student;
}
