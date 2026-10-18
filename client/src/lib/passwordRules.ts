/**
 * The password rules the server enforces on /auth/change-password. Shared so a
 * form cannot accept a password the API will then reject, or -- as the Profile
 * page did -- claim success without checking anything at all.
 */
export const PASSWORD_REQS = [
  { id: "length", text: "At least 8 characters", regex: /.{8,}/ },
  { id: "lowercase", text: "Lowercase letter", regex: /[a-z]/ },
  { id: "uppercase", text: "Uppercase letter", regex: /[A-Z]/ },
  { id: "number", text: "Contains a number", regex: /\d/ },
  { id: "special", text: "Special character", regex: /[!@#$%^&*(),.?":{}|<>]/ },
] as const;

export const passwordMeetsAllRules = (password: string): boolean =>
  PASSWORD_REQS.every((r) => r.regex.test(password));
