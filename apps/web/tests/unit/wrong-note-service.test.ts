import { WrongNoteReason } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getGradeOptionsForSchoolLevel, isGradeAllowedForSchoolLevel } from "@/modules/wrong-note/constants";
import {
  buildWrongNoteChartStats,
  buildWrongNoteWhere,
  buildWrongNotePagination,
  buildWrongNoteReasonChartBars,
  buildWrongNoteReasonCounts,
  buildWrongNoteTopUnits,
  buildWrongNoteUnitChartBars,
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

  it("supports advanced grade options within the student's school level", () => {
    expect(getGradeOptionsForSchoolLevel("middle")).toEqual([1, 2, 3]);
    expect(isGradeAllowedForSchoolLevel("middle", 2)).toBe(true);
    expect(isGradeAllowedForSchoolLevel("middle", 4)).toBe(false);
  });

  it("builds note filters with target grade and semester", () => {
    expect(
      buildWrongNoteWhere({
        studentId: "student-1",
        grade: 2,
        semester: 1,
      }),
    ).toMatchObject({
      studentId: "student-1",
      deletedAt: null,
      curriculumNode: {
        grade: 2,
        semester: 1,
      },
    });
  });

  it("builds reason chart bars in the fixed pedagogical order", () => {
    expect(
      buildWrongNoteReasonChartBars({
        calculation_mistake: 4,
        misread_question: 1,
        lack_of_concept: 3,
      }),
    ).toEqual([
      {
        key: "calculation_mistake",
        label: "단순 연산 실수",
        value: 4,
        meta: {
          reason: "calculation_mistake",
        },
      },
      {
        key: "misread_question",
        label: "문제 잘못 읽음",
        value: 1,
        meta: {
          reason: "misread_question",
        },
      },
      {
        key: "lack_of_concept",
        label: "문제 이해 못함",
        value: 3,
        meta: {
          reason: "lack_of_concept",
        },
      },
    ]);
  });

  it("fills zero-count unit bars and sorts by curriculum order", () => {
    expect(
      buildWrongNoteUnitChartBars(
        [
          {
            id: "node-2",
            unitName: "정수와 유리수",
            unitCode: "M1-S1-U2",
            sortOrder: 2,
          },
          {
            id: "node-1",
            unitName: "소인수분해",
            unitCode: "M1-S1-U1",
            sortOrder: 1,
          },
          {
            id: "node-3",
            unitName: "문자와 식",
            unitCode: "M1-S1-U3",
            sortOrder: 3,
          },
        ],
        [
          {
            curriculumNodeId: "node-2",
            _count: {
              _all: 2,
            },
          },
        ],
      ),
    ).toEqual([
      {
        key: "node-1",
        label: "소인수분해",
        value: 0,
        meta: {
          curriculumNodeId: "node-1",
          unitCode: "M1-S1-U1",
        },
      },
      {
        key: "node-2",
        label: "정수와 유리수",
        value: 2,
        meta: {
          curriculumNodeId: "node-2",
          unitCode: "M1-S1-U2",
        },
      },
      {
        key: "node-3",
        label: "문자와 식",
        value: 0,
        meta: {
          curriculumNodeId: "node-3",
          unitCode: "M1-S1-U3",
        },
      },
    ]);
  });

  it("computes chart max and total stats", () => {
    expect(
      buildWrongNoteChartStats([
        {
          key: "node-1",
          label: "소인수분해",
          value: 0,
        },
        {
          key: "node-2",
          label: "정수와 유리수",
          value: 3,
        },
        {
          key: "node-3",
          label: "문자와 식",
          value: 1,
        },
      ]),
    ).toEqual({
      maxValue: 3,
      totalCount: 4,
    });
  });
});
