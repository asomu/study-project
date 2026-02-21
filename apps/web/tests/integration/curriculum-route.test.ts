import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolLevel, Subject } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    curriculumNode: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/v1/curriculum/route";

const mockedFindMany = vi.mocked(prisma.curriculumNode.findMany);

describe("GET /api/v1/curriculum", () => {
  beforeEach(() => {
    mockedFindMany.mockReset();
  });

  it("returns 400 when asOfDate is missing", async () => {
    const request = new Request("http://localhost/api/v1/curriculum?schoolLevel=middle&grade=1&semester=1", {
      method: "GET",
    });

    const response = await GET(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prioritizes explicit curriculumVersion", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "node-1",
        curriculumVersion: "2026.01",
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        unitCode: "M1-S1-U1",
        unitName: "소인수분해",
        parentId: null,
        sortOrder: 1,
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
        activeTo: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    const request = new Request(
      "http://localhost/api/v1/curriculum?schoolLevel=middle&grade=1&semester=1&asOfDate=2026-02-21&curriculumVersion=2026.01",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const body = (await response.json()) as { meta: { curriculumVersion: string } };

    expect(response.status).toBe(200);
    expect(body.meta.curriculumVersion).toBe("2026.01");
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          curriculumVersion: "2026.01",
        }),
      }),
    );
  });
});
