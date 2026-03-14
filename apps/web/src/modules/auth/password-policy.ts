const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export function validateAccountPassword(password: string) {
  const trimmed = password.trim();

  if (trimmed.length < PASSWORD_MIN_LENGTH || trimmed.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`,
    } as const;
  }

  const hasLetter = /[A-Za-z]/.test(trimmed);
  const hasNumber = /\d/.test(trimmed);
  const hasSpecial = /[^A-Za-z0-9]/.test(trimmed);

  if (!hasLetter || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      message: "비밀번호는 영문, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.",
    } as const;
  }

  return { valid: true } as const;
}
