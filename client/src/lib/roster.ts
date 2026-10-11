// Shared by the admin account import, admin classroom enrollment and the
// instructor group-roster import: all three read the same roster CSV.
// Bulk import derives each student's address this way (server
// AdminController.bulkCreateUsers), so the same rule turns a roster row back
// into the account it created.
const STUDENT_EMAIL_DOMAIN = "eul.edu.tr";

// `lab_group` is optional: account import ignores it, the instructor's group
// roster import uses it. One file therefore serves both steps.
export type RosterRow = {
  first_name: string;
  last_name: string;
  student_number: string;
  lab_group?: string;
};

export const STUDENT_EMAIL_FOR = (studentNumber: string) =>
  `${studentNumber}@${STUDENT_EMAIL_DOMAIN}`;

// Returns null when the header is unusable, which each caller reports in its
// own words. Extra columns beyond the three required ones are preserved.
export const parseRosterCsv = (text: string): RosterRow[] | null => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  if (!['first_name', 'last_name', 'student_number'].every(h => headers.includes(h))) {
    return null;
  }

  return lines
    .slice(1)
    .map(line => {
      const values = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ''; });
      return row as RosterRow;
    })
    .filter(r => r.first_name && r.last_name && r.student_number);
};
