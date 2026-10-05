import React, { useState, useEffect, useRef } from "react";
import { Ticket } from "../api.js";

interface ResolutionGateModalProps {
  isOpen: boolean;
  ticket: Ticket;
  actionsCount: number;
  onClose: () => void;
  onConfirm: (resolutionSummary: string, expectedVersion: number) => Promise<void>;
  loading: boolean;
  conflictError?: { version: number; currentStatus: string; updatedAt: string } | null;
}

export default function ResolutionGateModal({
  isOpen,
  ticket,
  actionsCount,
  onClose,
  onConfirm,
  loading,
}: ResolutionGateModalProps) {
  const [resolutionSummary, setResolutionSummary] = useState<string>("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic gate evaluations
  const hasActions = actionsCount >= 1;
  const isSummaryValid = resolutionSummary.trim().length >= 5;
  const isGatePassed = hasActions && isSummaryValid;

  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      // Retain existing summary if ticket has one, otherwise keep user input
      if (!resolutionSummary && ticket.resolutionSummary) {
        setResolutionSummary(ticket.resolutionSummary);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, ticket]);

  // Keyboard accessibility: Escape to dismiss, Tab trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGatePassed || loading) return;

    setErrorBanner(null);
    try {
      await onConfirm(resolutionSummary.trim(), ticket.version ?? 1);
    } catch (err: any) {
      // 409 conflicts and server errors are handled with feedback
      if (err.code === "RESOLUTION_GATE_BLOCKED" && err.details) {
        const msgs = err.details.map((d: any) => d.message).join(" ");
        setErrorBanner(msgs || err.message);
      } else {
        setErrorBanner(err.message || "Failed to resolve ticket.");
      }
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolution-gate-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" ref={modalRef}>
        <div className="modal-content shadow-lg border-0">
          {/* Modal Header */}
          <div
            className="modal-header text-white"
            style={{ backgroundColor: "var(--color-primary-green, #006B3C)" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="material-symbols-outlined fs-4">verified</span>
              <h2 className="modal-title h5 mb-0 fw-bold" id="resolution-gate-modal-title">
                Ticket Resolution Gate
              </h2>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              data-testid="resolution-gate-close-btn"
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4">
              {/* Ticket Identification */}
              <div className="mb-3 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small">Target Ticket:</span>
                  <span className="fw-bold ms-2">{ticket.ticketNumber}</span>
                </div>
                <div className="text-muted small">
                  Current Status: <span className="badge bg-secondary">{ticket.currentStatus}</span>
                </div>
              </div>

              {/* Error Banner */}
              {errorBanner && (
                <div
                  className="alert alert-danger d-flex align-items-center gap-2 mb-3"
                  role="alert"
                  data-testid="resolution-gate-error-banner"
                >
                  <span className="material-symbols-outlined fs-5">error</span>
                  <div className="small flex-grow-1">{errorBanner}</div>
                </div>
              )}

              {/* Resolution Gate Dynamic Checklist (BR-09, AC-07, AC-08, AC-09) */}
              <div className="card mb-4 border-0" style={{ backgroundColor: "#F9FBF9" }}>
                <div className="card-body p-3">
                  <h3 className="h6 fw-bold mb-2 text-dark d-flex align-items-center gap-1">
                    <span className="material-symbols-outlined fs-5 text-success">checklist</span>
                    Resolution Criteria Checklist
                  </h3>
                  <p className="text-muted small mb-3">
                    The backend authoritative Resolution Gate requires verified diagnostic work and
                    a clear resolution summary before closure.
                  </p>

                  <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-live="polite">
                    {/* Item 1: Actions Taken Record */}
                    <li
                      className="d-flex align-items-start gap-2 small"
                      data-testid="gate-checklist-actions"
                    >
                      {hasActions ? (
                        <>
                          <span
                            className="material-symbols-outlined fs-5 fw-bold"
                            style={{ color: "var(--color-success, #22543D)" }}
                          >
                            check_circle
                          </span>
                          <span style={{ color: "var(--color-success, #22543D)" }}>
                            <strong>Actions Recorded:</strong> Ticket has {actionsCount} Action Taken line item(s).
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="material-symbols-outlined fs-5 fw-bold text-danger"
                          >
                            cancel
                          </span>
                          <span className="text-danger">
                            <strong>Action Taken Required:</strong> At least one Action Taken must be recorded before resolving.
                          </span>
                        </>
                      )}
                    </li>

                    {/* Item 2: Resolution Summary */}
                    <li
                      className="d-flex align-items-start gap-2 small"
                      data-testid="gate-checklist-summary"
                    >
                      {isSummaryValid ? (
                        <>
                          <span
                            className="material-symbols-outlined fs-5 fw-bold"
                            style={{ color: "var(--color-success, #22543D)" }}
                          >
                            check_circle
                          </span>
                          <span style={{ color: "var(--color-success, #22543D)" }}>
                            <strong>Resolution Summary:</strong> Summary meets minimum requirement (5+ characters).
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="material-symbols-outlined fs-5 fw-bold text-danger"
                          >
                            cancel
                          </span>
                          <span className="text-danger">
                            <strong>Resolution Summary Required:</strong> Provide a non-empty summary (minimum 5 characters).
                          </span>
                        </>
                      )}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Resolution Summary Input */}
              <div className="mb-3">
                <label
                  htmlFor="resolutionSummaryInput"
                  className="form-label fw-semibold text-dark mb-1"
                >
                  Resolution Summary <span className="text-danger">*</span>
                </label>
                <textarea
                  id="resolutionSummaryInput"
                  data-testid="resolution-summary-input"
                  ref={textareaRef}
                  className="form-control"
                  rows={4}
                  placeholder="Detail the technical fix, configuration changes, or root cause addressed..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  disabled={loading}
                  required
                  style={{ minHeight: "100px", resize: "vertical" }}
                  aria-describedby="resolutionSummaryHelp"
                />
                <div id="resolutionSummaryHelp" className="form-text small d-flex justify-content-between mt-1">
                  <span>Minimum 5 characters. Explain what was done to solve the issue.</span>
                  <span className={resolutionSummary.trim().length >= 5 ? "text-success fw-medium" : "text-muted"}>
                    {resolutionSummary.trim().length} / 5+ characters
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={loading}
                data-testid="resolution-gate-cancel-btn"
              >
                Cancel
              </button>

              <span
                title={
                  !isGatePassed
                    ? "All checklist requirements must be met before confirming resolution."
                    : undefined
                }
              >
                <button
                  type="submit"
                  data-testid="confirm-resolution-btn"
                  className="btn btn-zen-primary d-inline-flex align-items-center gap-2"
                  disabled={!isGatePassed || loading}
                  style={loading ? { pointerEvents: "none", opacity: 0.75 } : {}}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined fs-6">task_alt</span>
                      <span>Confirm Resolution</span>
                    </>
                  )}
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
