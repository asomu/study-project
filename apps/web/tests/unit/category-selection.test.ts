import { describe, expect, it } from "vitest";
import { buildWrongAnswerCategoryDraft, toCategoryKeysForSave, toggleCategorySelection } from "@/modules/mistake-note/category-selection";

describe("wrong-answer category selection", () => {
  it("builds draft map from wrong-answer categories as string array", () => {
    const result = buildWrongAnswerCategoryDraft([
      {
        id: "wa-1",
        categories: [
          { key: "calculation_mistake" },
          { key: "misread_question" },
        ],
      },
      {
        id: "wa-2",
        categories: [],
      },
    ]);

    expect(result).toEqual({
      "wa-1": ["calculation_mistake", "misread_question"],
      "wa-2": [],
    });
  });

  it("serializes selected category keys to unique payload list", () => {
    const result = toCategoryKeysForSave([" calculation_mistake ", "misread_question", "misread_question"]);

    expect(result).toEqual(["calculation_mistake", "misread_question"]);
  });

  it("returns empty array when all categories are deselected", () => {
    const removed = toggleCategorySelection(["calculation_mistake"], "calculation_mistake", false);
    const result = toCategoryKeysForSave(removed);

    expect(result).toEqual([]);
  });
});
