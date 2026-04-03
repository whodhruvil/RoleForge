export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVIDER_API_KEY_REGEX = /^(sk-\S{20,}|gsk_\S{20,}|AIza[0-9A-Za-z_-]{30,})$/;

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim());
}

export function isStrongPassword(password: string) {
  const value = password.trim();
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}

export function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLikelyClaudeApiKey(value: string) {
  return PROVIDER_API_KEY_REGEX.test(value.trim());
}
