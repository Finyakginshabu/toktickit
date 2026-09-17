import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export function ChangePassword() {
  const { changePassword, logout, error, clearError } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Complexity rules checks
  const ruleLength = newPassword.length >= 8;
  const ruleUpper = /[A-Z]/.test(newPassword);
  const ruleLower = /[a-z]/.test(newPassword);
  const ruleNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const ruleDifferent = currentPassword.length > 0 && newPassword.length > 0 && newPassword !== currentPassword;
  const ruleMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const allRulesPassed =
    ruleLength && ruleUpper && ruleLower && ruleNumberOrSpecial && ruleDifferent && ruleMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setClientError(null);

    if (!currentPassword) {
      setClientError("Current password is required");
      return;
    }

    if (!allRulesPassed) {
      setClientError("Please satisfy all password security requirements below");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ backgroundColor: "var(--color-bg, #F5F7F6)", padding: "20px" }}
    >
      <div
        className="card shadow-sm border"
        style={{
          maxWidth: "480px",
          width: "100%",
          borderRadius: "8px",
          borderColor: "var(--color-border, #D8E2DC)",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "var(--color-pale-green, #EAF6EF)",
                color: "var(--color-primary, #006B3C)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
                lock_reset
              </span>
            </div>
            <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-text, #1C2A22)" }}>
              Password Change Required
            </h1>
            <p className="text-muted small mb-0">
              For security, you must update your password before accessing the system.
            </p>
          </div>

          {/* Error Message */}
          {(error || clientError) && (
            <div
              className="alert alert-danger d-flex align-items-center mb-3 py-2 px-3 small"
              role="alert"
              style={{
                borderRadius: "6px",
                borderColor: "#FED7D7",
                backgroundColor: "var(--color-error-bg, #FFF5F5)",
                color: "var(--color-error, #C53030)",
              }}
            >
              <span className="material-symbols-outlined me-2 fs-6">error</span>
              <div>{clientError || error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Current Password */}
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label small fw-semibold text-dark mb-1">
                Current Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: "42px" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                  style={{ borderColor: "var(--color-border, #D8E2DC)" }}
                >
                  <span className="material-symbols-outlined fs-6 align-middle">
                    {showCurrent ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label small fw-semibold text-dark mb-1">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: "42px" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                  style={{ borderColor: "var(--color-border, #D8E2DC)" }}
                >
                  <span className="material-symbols-outlined fs-6 align-middle">
                    {showNew ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label small fw-semibold text-dark mb-1">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  className="form-control"
                  placeholder="Repeat new secure password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: "42px" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  style={{ borderColor: "var(--color-border, #D8E2DC)" }}
                >
                  <span className="material-symbols-outlined fs-6 align-middle">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Complexity Checklist */}
            <div
              className="p-3 mb-4 rounded border"
              style={{ backgroundColor: "var(--color-surface, #FAFBFA)", borderColor: "var(--color-border, #D8E2DC)" }}
            >
              <div className="small fw-semibold mb-2" style={{ color: "var(--color-text, #1C2A22)" }}>
                Password Requirements:
              </div>
              <ul className="list-unstyled mb-0 small text-muted">
                <li className="d-flex align-items-center mb-1">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleLength ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleLength ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleLength ? "#2D3748" : undefined }}>
                    At least 8 characters in length
                  </span>
                </li>
                <li className="d-flex align-items-center mb-1">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleUpper ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleUpper ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleUpper ? "#2D3748" : undefined }}>
                    At least one uppercase letter (A-Z)
                  </span>
                </li>
                <li className="d-flex align-items-center mb-1">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleLower ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleLower ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleLower ? "#2D3748" : undefined }}>
                    At least one lowercase letter (a-z)
                  </span>
                </li>
                <li className="d-flex align-items-center mb-1">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleNumberOrSpecial ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleNumberOrSpecial ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleNumberOrSpecial ? "#2D3748" : undefined }}>
                    At least one number or special character
                  </span>
                </li>
                <li className="d-flex align-items-center mb-1">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleDifferent ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleDifferent ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleDifferent ? "#2D3748" : undefined }}>
                    Different from current password
                  </span>
                </li>
                <li className="d-flex align-items-center">
                  <span
                    className="material-symbols-outlined me-2 fs-6"
                    style={{ color: ruleMatch ? "#38A169" : "#A0AEC0" }}
                  >
                    {ruleMatch ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span style={{ color: ruleMatch ? "#2D3748" : undefined }}>
                    New password and confirmation match
                  </span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <button
              type="submit"
              className="btn w-100 py-2 fw-semibold text-white d-flex align-items-center justify-content-center mb-2"
              disabled={isSubmitting || !allRulesPassed}
              style={{
                backgroundColor: allRulesPassed ? "var(--color-primary, #006B3C)" : "#A0AEC0",
                borderColor: allRulesPassed ? "var(--color-primary, #006B3C)" : "#A0AEC0",
                height: "44px",
                borderRadius: "6px",
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </button>

            <button
              type="button"
              className="btn btn-link w-100 text-muted small text-decoration-none"
              onClick={logout}
              disabled={isSubmitting}
            >
              Sign out and return later
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
