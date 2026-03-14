import { describe, expect, it } from "vitest";
import { PracticeProblemType } from "@prisma/client";
import {
  hasPracticeSetStructuralChanges,
  normalizeSkillTags,
} from "@/modules/study/authoring";
import { conceptContentSchema, practiceSetUpsertSchema } from "@/modules/study/schemas";

describe("study authoring", () => {
  it("normalizes skill tags by trim, lowercase, and dedupe", () => {
    expect(normalizeSkillTags([" Factor_Tree ", "prime_factorization", "factor_tree", "", " PRIME_FACTORIZATION "])).toEqual([
      "factor_tree",
      "prime_factorization",
    ]);
  });

  it("keeps metadata-only practice set edits as non-structural", () => {
    const result = hasPracticeSetStructuralChanges(
      {
        schoolLevel: "middle",
        grade: 1,
        semester: 1,
        curriculumNodeId: "node-1",
        problems: [
          {
            problemNo: 1,
            type: PracticeProblemType.short_answer,
            prompt: "x + 1 = 3",
            choicesJson: null,
            correctAnswer: "2",
            explanation: null,
            skillTags: ["equation"],
            difficulty: 1,
          },
        ],
      },
      {
        schoolLevel: "middle",
        grade: 1,
        semester: 1,
        curriculumNodeId: "node-1",
        problems: [
          {
            problemNo: 1,
            type: PracticeProblemType.short_answer,
            prompt: "x + 1 = 3",
            choices: null,
            correctAnswer: "2",
            explanation: null,
            skillTags: ["equation"],
            difficulty: 1,
          },
        ],
      },
    );

    expect(result).toBe(false);
  });

  it("detects structural changes when practice problems differ", () => {
    const result = hasPracticeSetStructuralChanges(
      {
        schoolLevel: "middle",
        grade: 1,
        semester: 1,
        curriculumNodeId: "node-1",
        problems: [
          {
            problemNo: 1,
            type: PracticeProblemType.single_choice,
            prompt: "18의 소인수분해는?",
            choicesJson: ["2 x 3 x 3", "2 x 9"],
            correctAnswer: "2 x 3 x 3",
            explanation: null,
            skillTags: ["factor_tree"],
            difficulty: 2,
          },
        ],
      },
      {
        schoolLevel: "middle",
        grade: 1,
        semester: 1,
        curriculumNodeId: "node-1",
        problems: [
          {
            problemNo: 1,
            type: PracticeProblemType.single_choice,
            prompt: "18의 소인수분해는?",
            choices: ["2 x 3 x 3", "3 x 6"],
            correctAnswer: "2 x 3 x 3",
            explanation: null,
            skillTags: ["factor_tree"],
            difficulty: 2,
          },
        ],
      },
    );

    expect(result).toBe(true);
  });

  it("rejects invalid single choice practice problems", () => {
    const parsed = practiceSetUpsertSchema.safeParse({
      title: "소인수분해 워밍업",
      description: null,
      schoolLevel: "middle",
      grade: 1,
      semester: 1,
      curriculumNodeId: "node-1",
      sortOrder: 1,
      isActive: true,
      problems: [
        {
          problemNo: 1,
          type: PracticeProblemType.single_choice,
          prompt: "알맞은 답은?",
          choices: ["1"],
          correctAnswer: "2",
          explanation: null,
          skillTags: ["tag"],
          difficulty: 2,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid concept table rows and accepts supported blocks", () => {
    const invalid = conceptContentSchema.safeParse({
      blocks: [
        {
          type: "table",
          rows: [["왼쪽", "오른쪽", "추가 열"]],
        },
      ],
    });
    const valid = conceptContentSchema.safeParse({
      blocks: [
        {
          type: "headline",
          text: "핵심 문장",
        },
        {
          type: "steps",
          items: ["1단계", "2단계"],
        },
        {
          type: "table",
          rows: [["왼쪽", "오른쪽"]],
        },
      ],
    });

    expect(invalid.success).toBe(false);
    expect(valid.success).toBe(true);
  });
});
