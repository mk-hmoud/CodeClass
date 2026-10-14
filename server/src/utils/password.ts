import crypto from "crypto";

/**
 * Alphabets for generated student passwords. Deliberately excludes characters
 * that are misread off a printed list -- 0/O, 1/l/I -- because the instructor
 * hands these out on paper and a student who mistypes one cannot self-recover.
 * Punctuation is limited to a few keys that sit in the same place on the
 * keyboard layouts in the labs.
 */
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGIT = "23456789";
const SPECIAL = "!@#$%*?";
const ALL = LOWER + UPPER + DIGIT + SPECIAL;

const PASSWORD_LENGTH = 10;

/** Uniform index into `set`, rejection-sampled so no character is favoured. */
const pick = (set: string): string => {
  const limit = Math.floor(256 / set.length) * set.length;
  for (;;) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < limit) return set[byte % set.length];
  }
};

/**
 * One random password per student, satisfying the same five rules the manual
 * create-user form enforces (length, lower, upper, digit, special) so a
 * generated password is never weaker than a hand-typed one.
 *
 * crypto.randomBytes, not Math.random: these are real credentials for real
 * accounts, and Math.random is predictable from previous outputs.
 */
export const generateStudentPassword = (): string => {
  const required = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SPECIAL)];
  const rest = Array.from({ length: PASSWORD_LENGTH - required.length }, () => pick(ALL));
  const chars = [...required, ...rest];

  // Fisher-Yates with crypto randomness; a `sort(() => 0.5 - Math.random())`
  // shuffle is biased and would leave the required characters near the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
