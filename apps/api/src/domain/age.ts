/** Minimum age for student accounts (client decision: 13+, no children under 13). */
export const MIN_STUDENT_AGE = 13;

/** Age in full years on `today` (UTC calendar dates). */
export function ageOn(birthDate: string, today: Date) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isOldEnough(birthDate: string, today: Date, min = MIN_STUDENT_AGE) {
  return /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) >= min;
}
