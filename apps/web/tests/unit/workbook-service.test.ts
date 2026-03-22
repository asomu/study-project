import { describe, expect, it } from "vitest";
import {
  buildWorkbookProgressMatrix,
  normalizeWorkbookStages,
  validateWorkbookStageNames,
} from "@/modules/workbook/service";

describe("workbook service helpers", () => {
  it("normalizes and reorders workbook stages", () => {
    expect(
      normalizeWorkbookStages([
        { name: " 핵심문제 익히기 ", sortOrder: 2 },
        { name: "개념원리 이해", sortOrder: 0 },
        { name: "중단원 마무리하기", sortOrder: 1 },
      ]),
    ).toEqual([
      { name: "개념원리 이해", sortOrder: 0 },
      { name: "중단원 마무리하기", sortOrder: 1 },
      { name: "핵심문제 익히기", sortOrder: 2 },
    ]);
  });

  it("rejects duplicate workbook stage names", () => {
    expect(
      validateWorkbookStageNames([
        { name: "개념원리 이해" },
        { name: "핵심문제 익히기" },
      ]),
    ).toBe(true);
    expect(
      validateWorkbookStageNames([
        { name: "개념원리 이해" },
        { name: " 개념원리 이해 " },
      ]),
    ).toBe(false);
  });

  it("fills missing workbook progress cells as not_started and computes summary bars", () => {
    expect(
      buildWorkbookProgressMatrix({
        nodes: [
          { id: "node-2", unitName: "정수와 유리수", unitCode: "M1-S1-U2", sortOrder: 2 },
          { id: "node-1", unitName: "소인수분해", unitCode: "M1-S1-U1", sortOrder: 1 },
        ],
        stages: [
          { id: "stage-1", name: "개념원리 이해", sortOrder: 0 },
          { id: "stage-2", name: "핵심문제 익히기", sortOrder: 1 },
        ],
        progressRecords: [
          {
            curriculumNodeId: "node-1",
            workbookTemplateStageId: "stage-1",
            status: "completed",
            lastUpdatedAt: new Date("2026-03-22T10:00:00.000Z"),
          },
          {
            curriculumNodeId: "node-2",
            workbookTemplateStageId: "stage-2",
            status: "in_progress",
            lastUpdatedAt: new Date("2026-03-22T11:00:00.000Z"),
          },
        ],
      }),
    ).toEqual({
      summary: {
        totalSteps: 4,
        notStartedCount: 2,
        inProgressCount: 1,
        completedCount: 1,
        completedPct: 25,
      },
      unitBars: [
        {
          curriculumNodeId: "node-1",
          unitName: "소인수분해",
          completedSteps: 1,
          totalSteps: 2,
        },
        {
          curriculumNodeId: "node-2",
          unitName: "정수와 유리수",
          completedSteps: 0,
          totalSteps: 2,
        },
      ],
      units: [
        {
          curriculumNodeId: "node-1",
          unitName: "소인수분해",
          stageStates: [
            {
              workbookTemplateStageId: "stage-1",
              stageName: "개념원리 이해",
              status: "completed",
              lastUpdatedAt: "2026-03-22T10:00:00.000Z",
            },
            {
              workbookTemplateStageId: "stage-2",
              stageName: "핵심문제 익히기",
              status: "not_started",
              lastUpdatedAt: null,
            },
          ],
        },
        {
          curriculumNodeId: "node-2",
          unitName: "정수와 유리수",
          stageStates: [
            {
              workbookTemplateStageId: "stage-1",
              stageName: "개념원리 이해",
              status: "not_started",
              lastUpdatedAt: null,
            },
            {
              workbookTemplateStageId: "stage-2",
              stageName: "핵심문제 익히기",
              status: "in_progress",
              lastUpdatedAt: "2026-03-22T11:00:00.000Z",
            },
          ],
        },
      ],
    });
  });
});
