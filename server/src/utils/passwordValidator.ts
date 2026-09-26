export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password complexity per BR-06:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number or special character
 * - Optionally: newPassword !== currentPassword
 */
export function validatePasswordComplexity(
  newPassword: string,
  currentPassword?: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (!newPassword || newPassword.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(newPassword)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(newPassword)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
    errors.push("Password must contain at least one number or special character");
  }
  if (currentPassword !== undefined && newPassword === currentPassword) {
    errors.push("New password must be different from current password");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
