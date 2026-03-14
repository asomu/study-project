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

type MaterialOwnershipParams = BaseOwnershipParams & {
  materialId: string;
};

type AttemptOwnershipParams = BaseOwnershipParams & {
  attemptId: string;
};

type AttemptItemOwnershipParams = BaseOwnershipParams & {
  attemptItemId: string;
};

type WrongAnswerOwnershipParams = BaseOwnershipParams & {
  wrongAnswerId: string;
};

function getClient(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type OwnedMaterial = Prisma.MaterialGetPayload<{
  include: {
    student: true;
  };
}>;

export type OwnedAttempt = Prisma.AttemptGetPayload<{
  include: {
    student: true;
    material: true;
  };
}>;

export type OwnedAttemptItem = Prisma.AttemptItemGetPayload<{
  include: {
    attempt: {
      include: {
        student: true;
        material: true;
      };
    };
  };
}>;

export type OwnedWrongAnswer = Prisma.WrongAnswerGetPayload<{
  include: {
    attemptItem: {
      include: {
        attempt: {
          include: {
            student: true;
            material: true;
          };
        };
      };
    };
    categories: {
      include: {
        category: true;
      };
    };
  };
}>;

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

export async function getOwnedMaterial({ materialId, guardianUserId, tx }: MaterialOwnershipParams) {
  const client = getClient(tx);

  return client.material.findFirst({
    where: {
      id: materialId,
      student: {
        guardianUserId,
      },
    },
    include: {
      student: true,
    },
  });
}

export async function assertMaterialOwnership(params: MaterialOwnershipParams): Promise<OwnedMaterial> {
  const material = await getOwnedMaterial(params);

  if (!material) {
    logOwnershipDenied("material", params.materialId, params.guardianUserId);
    throw new OwnershipError("Requested material does not belong to authenticated guardian");
  }

  return material;
}

export async function getOwnedAttempt({ attemptId, guardianUserId, tx }: AttemptOwnershipParams) {
  const client = getClient(tx);

  return client.attempt.findFirst({
    where: {
      id: attemptId,
      student: {
        guardianUserId,
      },
    },
    include: {
      student: true,
      material: true,
    },
  });
}

export async function assertAttemptOwnership(params: AttemptOwnershipParams): Promise<OwnedAttempt> {
  const attempt = await getOwnedAttempt(params);

  if (!attempt) {
    logOwnershipDenied("attempt", params.attemptId, params.guardianUserId);
    throw new OwnershipError("Requested attempt does not belong to authenticated guardian");
  }

  return attempt;
}

export async function getOwnedAttemptItem({ attemptItemId, guardianUserId, tx }: AttemptItemOwnershipParams) {
  const client = getClient(tx);

  return client.attemptItem.findFirst({
    where: {
      id: attemptItemId,
      attempt: {
        student: {
          guardianUserId,
        },
      },
    },
    include: {
      attempt: {
        include: {
          student: true,
          material: true,
        },
      },
    },
  });
}

export async function assertAttemptItemOwnership(params: AttemptItemOwnershipParams): Promise<OwnedAttemptItem> {
  const attemptItem = await getOwnedAttemptItem(params);

  if (!attemptItem) {
    logOwnershipDenied("attempt_item", params.attemptItemId, params.guardianUserId);
    throw new OwnershipError("Requested attempt item does not belong to authenticated guardian");
  }

  return attemptItem;
}

export async function getOwnedWrongAnswer({ wrongAnswerId, guardianUserId, tx }: WrongAnswerOwnershipParams) {
  const client = getClient(tx);

  return client.wrongAnswer.findFirst({
    where: {
      id: wrongAnswerId,
      attemptItem: {
        attempt: {
          student: {
            guardianUserId,
          },
        },
      },
    },
    include: {
      attemptItem: {
        include: {
          attempt: {
            include: {
              student: true,
              material: true,
            },
          },
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
  });
}

export async function assertWrongAnswerOwnership(params: WrongAnswerOwnershipParams): Promise<OwnedWrongAnswer> {
  const wrongAnswer = await getOwnedWrongAnswer(params);

  if (!wrongAnswer) {
    logOwnershipDenied("wrong_answer", params.wrongAnswerId, params.guardianUserId);
    throw new OwnershipError("Requested wrong answer does not belong to authenticated guardian");
  }

  return wrongAnswer;
}
