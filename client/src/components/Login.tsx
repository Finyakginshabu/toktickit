import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export function Login() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      // Error handled by AuthContext
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
          maxWidth: "440px",
          width: "100%",
          borderRadius: "8px",
          borderColor: "var(--color-border, #D8E2DC)",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-4">
          {/* Brand Header */}
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
                confirmation_number
              </span>
            </div>
            <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-text, #1C2A22)" }}>
              Sign in to TokTickIT
            </h1>
            <p className="text-muted small mb-0">Enter your credentials to access your support portal</p>
          </div>

          {/* Error Banner */}
          {error && (
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
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label small fw-semibold text-dark mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                disabled={isSubmitting}
                autoFocus
                style={{ height: "42px" }}
              />
              {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label htmlFor="login-password" className="form-label small fw-semibold text-dark mb-1">
                Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  disabled={isSubmitting}
                  style={{ height: "42px" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{ borderColor: "var(--color-border, #D8E2DC)" }}
                >
                  <span className="material-symbols-outlined fs-6 align-middle">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {fieldErrors.password && <div className="invalid-feedback d-block">{fieldErrors.password}</div>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn w-100 py-2 fw-semibold text-white d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--color-primary, #006B3C)",
                borderColor: "var(--color-primary, #006B3C)",
                height: "44px",
                borderRadius: "6px",
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
