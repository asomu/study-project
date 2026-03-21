import { WrongNoteReason } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildWrongNotePagination,
  buildWrongNoteReasonCounts,
  buildWrongNoteTopUnits,
  normalizeOptionalText,
} from "@/modules/wrong-note/service";

describe("wrong-note service helpers", () => {
  it("normalizes empty text to null", () => {
    expect(normalizeOptionalText("  ")).toBeNull();
    expect(normalizeOptionalText(" 메모 ")).toBe("메모");
  });

  it("builds complete reason counts including zero values", () => {
    expect(
      buildWrongNoteReasonCounts([
        {
          reason: WrongNoteReason.calculation_mistake,
          _count: {
            _all: 2,
          },
        },
      ]),
    ).toEqual({
      calculation_mistake: 2,
      misread_question: 0,
      lack_of_concept: 0,
    });
  });

  it("sorts top units by count and unit name", () => {
    expect(
      buildWrongNoteTopUnits([
        {
          curriculumNodeId: "node-2",
          unitName: "정수와 유리수",
        },
        {
          curriculumNodeId: "node-1",
          unitName: "소인수분해",
        },
        {
          curriculumNodeId: "node-2",
          unitName: "정수와 유리수",
        },
      ]),
    ).toEqual([
      {
        curriculumNodeId: "node-2",
        unitName: "정수와 유리수",
        count: 2,
      },
      {
        curriculumNodeId: "node-1",
        unitName: "소인수분해",
        count: 1,
      },
    ]);
  });

  it("builds pagination with at least one page", () => {
    expect(buildWrongNotePagination(1, 12, 0)).toEqual({
      page: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 1,
    });
  });
});
