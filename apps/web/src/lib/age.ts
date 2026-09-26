/** Students must be 13 or older (client decision). Mirrors apps/api/src/domain/age.ts. */
export const MIN_STUDENT_AGE = 13;

export function ageOn(birthDate: string, today = new Date()) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

/** Latest allowed birth date (yyyy-mm-dd) for the date picker. */
export function latestBirthDate(today = new Date()) {
  const d = new Date(today.getFullYear() - MIN_STUDENT_AGE, today.getMonth(), today.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
