export const WRONG_ANSWER_CATEGORY_OPTIONS = [
  { key: "calculation_mistake", labelKo: "단순 연산 실수" },
  { key: "misread_question", labelKo: "문제 잘못 읽음" },
  { key: "lack_of_concept", labelKo: "문제 이해 못함" },
] as const;

type WrongAnswerCategoryEntry = {
  key: string;
};

type WrongAnswerCategoryDraftInput = {
  id: string;
  categories: WrongAnswerCategoryEntry[];
};

export function buildWrongAnswerCategoryDraft(items: WrongAnswerCategoryDraftInput[]) {
  return Object.fromEntries(items.map((item) => [item.id, item.categories.map((entry) => entry.key)]));
}

export function toggleCategorySelection(selectedKeys: string[], categoryKey: string, checked: boolean) {
  if (!checked) {
    return selectedKeys.filter((key) => key !== categoryKey);
  }

  if (selectedKeys.includes(categoryKey)) {
    return selectedKeys;
  }

  return [...selectedKeys, categoryKey];
}

export function toCategoryKeysForSave(selectedKeys: string[]) {
  return [...new Set(selectedKeys.map((key) => key.trim()).filter(Boolean))];
}
