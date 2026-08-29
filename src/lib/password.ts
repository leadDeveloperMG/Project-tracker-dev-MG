const MIN_LENGTH = 10;

export function validatePassword(password: string) {
  if (password.length < MIN_LENGTH) {
    return `Use at least ${MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) return "Include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include an uppercase letter.";
  if (!/\d/.test(password)) return "Include a number.";
  return null;
}
