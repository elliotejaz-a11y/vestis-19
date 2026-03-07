export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS = "Password must be at least 8 characters and include a letter, a number, and a special character.";

export function isPasswordValid(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
}
