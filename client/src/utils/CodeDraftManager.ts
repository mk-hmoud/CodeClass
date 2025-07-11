export const CODE_DRAFT_PREFIX = "code-draft-";

export interface CodeDraft {
  code: string;
  language: string;
  assignmentId: number | string;
  classroomId: number | string;
  expirationDate: string | null;
  lastSaved: string;
  assignmentTitle: string;
}

export const saveCodeDraft = (
  assignmentId: number | string,
  code: string,
  language: string,
  expirationDate: Date | null,
  assignmentTitle: string,
  classroomId: number | string
): boolean => {
  try {
    const draftKey = `${CODE_DRAFT_PREFIX}${assignmentId}`;
    const draftData: CodeDraft = {
      code,
      language,
      assignmentId,
      classroomId, // Save classroomId
      expirationDate: expirationDate?.toISOString() || null,
      lastSaved: new Date().toISOString(),
      assignmentTitle,
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    return true;
  } catch (error) {
    console.error("Error saving code draft:", error);
    return false;
  }
};

export const getCodeDraft = (assignmentId: number | string): CodeDraft | null => {
  try {
    const draftKey = `${CODE_DRAFT_PREFIX}${assignmentId}`;
    const draftJson = localStorage.getItem(draftKey);
    if (!draftJson) return null;
    const draft = JSON.parse(draftJson) as CodeDraft;
    if (draft.expirationDate) {
      const expirationDate = new Date(draft.expirationDate);
      if (expirationDate < new Date()) {
        localStorage.removeItem(draftKey);
        return null;
      }
    }
    return draft;
  } catch (error) {
    console.error("Error retrieving code draft:", error);
    return null;
  }
};

export const removeCodeDraft = (assignmentId: number | string): void => {
  try {
    const draftKey = `${CODE_DRAFT_PREFIX}${assignmentId}`;
    localStorage.removeItem(draftKey);
  } catch (error) {
    console.error("Error removing code draft:", error);
  }
};

export const getAllCodeDrafts = (): CodeDraft[] => {
  try {
    const drafts: CodeDraft[] = [];
    const now = new Date();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CODE_DRAFT_PREFIX)) {
        try {
          const draftJson = localStorage.getItem(key);
          if (!draftJson) continue;
          const draft = JSON.parse(draftJson) as CodeDraft;
          if (!draft.expirationDate || new Date(draft.expirationDate) > now) {
            drafts.push(draft);
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error("Invalid draft data:", e);
        }
      }
    }
    return drafts.sort((a, b) => {
      const dateA = new Date(a.lastSaved).getTime();
      const dateB = new Date(b.lastSaved).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting all code drafts:", error);
    return [];
  }
};
