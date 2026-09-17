import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../../src/utils/passwordValidator.js";

describe("UNIT-01: Password Complexity and Reuse Validator", () => {
  it("passes when password meets all criteria (8+ chars, upper, lower, number/symbol)", () => {
    const res = validatePasswordComplexity("SecurePass2026!", "OldPass123!");
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("fails when password is shorter than 8 characters", () => {
    const res = validatePasswordComplexity("Short1!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must be at least 8 characters");
  });

  it("fails when missing uppercase letter", () => {
    const res = validatePasswordComplexity("lowercase123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("fails when missing lowercase letter", () => {
    const res = validatePasswordComplexity("UPPERCASE123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one lowercase letter");
  });

  it("fails when missing number or special character", () => {
    const res = validatePasswordComplexity("NoNumberOrSpecial");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one number or special character");
  });

  it("fails when newPassword is identical to currentPassword (BR-06)", () => {
    const res = validatePasswordComplexity("SamePassword123!", "SamePassword123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("New password must be different from current password");
  });
});
