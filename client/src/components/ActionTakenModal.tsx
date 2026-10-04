import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  ActionTaken,
  createTicketAction,
  updateTicketAction,
  CreateActionTakenPayload,
  UpdateActionTakenPayload,
} from "../api.js";

interface ActionTakenModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  actionToEdit?: ActionTaken | null;
  onActionSaved: (action: ActionTaken) => void;
  triggerButtonRef?: HTMLElement | null;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ActionTakenModal({
  isOpen,
  onClose,
  ticketId,
  actionToEdit,
  onActionSaved,
  triggerButtonRef,
}: ActionTakenModalProps) {
  const { user: authUser } = useAuth();

  // Form Fields State
  const [actionDateTime, setActionDateTime] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  // Validation & Submission States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(actionToEdit);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFieldErrors({});
      setServerError(null);
      setIsSubmitting(false);

      if (actionToEdit) {
        // Populate for Edit mode
        const dt = actionToEdit.actionDateTime
          ? toLocalDatetimeString(new Date(actionToEdit.actionDateTime))
          : toLocalDatetimeString(new Date());
        setActionDateTime(dt);
        setDescription(actionToEdit.actionDescription || "");
        setResult(actionToEdit.result || "");
        setFollowUpRequired(Boolean(actionToEdit.followUpRequired));
        setFollowUpNote(actionToEdit.followUpNote || "");
        setAttachmentNotes(actionToEdit.attachmentNotes || "");
      } else {
        // Populate for Create mode
        setActionDateTime(toLocalDatetimeString(new Date()));
        setDescription("");
        setResult("");
        setFollowUpRequired(false);
        setFollowUpNote("");
        setAttachmentNotes("");
      }

      // Accessible initial focus
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    } else if (triggerButtonRef) {
      triggerButtonRef.focus();
    }
  }, [isOpen, actionToEdit, triggerButtonRef]);

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const performerDisplayName = isEditing
    ? actionToEdit?.performedBy?.name || authUser?.name || "Support Staff"
    : authUser?.name || "Support Staff";

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Description: required, 5-2000 chars
    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 5) {
      errors.description = "Action description is required (minimum 5 characters).";
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Action description cannot exceed 2000 characters.";
    }

    const trimmedResult = result.trim();
    if (trimmedResult.length > 2000) {
      errors.result = "Result cannot exceed 2000 characters.";
    }

    // 3. Follow-up Note: required if followUpRequired is checked (min 5 chars, max 2000 chars)
    if (followUpRequired) {
      const trimmedNote = followUpNote.trim();
      if (!trimmedNote || trimmedNote.length < 5) {
        errors.followUpNote = "Follow-up note is required when follow-up is requested (minimum 5 characters).";
      } else if (trimmedNote.length > 2000) {
        errors.followUpNote = "Follow-up note cannot exceed 2000 characters.";
      }
    }

    // 4. Attachment Notes: max 1000 chars
    if (attachmentNotes.trim().length > 1000) {
      errors.attachmentNotes = "Attachment notes cannot exceed 1000 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const isoDate = actionDateTime ? new Date(actionDateTime).toISOString() : new Date().toISOString();

      if (isEditing && actionToEdit) {
        const updatePayload: UpdateActionTakenPayload = {
          expectedVersion: actionToEdit.version,
          actionDescription: description.trim(),
          result: result.trim() ? result.trim() : null,
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
        };

        const updated = await updateTicketAction(ticketId, actionToEdit.id, updatePayload);
        onActionSaved(updated);
        onClose();
      } else {
        const createPayload: CreateActionTakenPayload = {
          actionDateTime: isoDate,
          actionDescription: description.trim(),
          result: result.trim() ? result.trim() : null,
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
        };

        const created = await createTicketAction(ticketId, createPayload);
        onActionSaved(created);
        onClose();
      }
    } catch (err: any) {
      // Form data retention: fields are preserved on error
      setServerError(err.message || "Failed to save action taken. Please check inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" ref={modalRef}>
        <div className="modal-content border-0 shadow">
          {/* Header */}
          <div className="modal-header bg-light border-bottom">
            <h5 className="modal-title fw-bold text-success d-flex align-items-center gap-2" id="action-modal-title">
              <span className="material-symbols-outlined fs-5">
                {isEditing ? "edit_note" : "add_task"}
              </span>
              {isEditing ? "Edit Action Taken" : "Add Action Taken"}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {serverError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
                  <span className="material-symbols-outlined fs-5">error</span>
                  <span>{serverError}</span>
                </div>
              )}

              <div className="row g-3">
                {/* 1. Action Date/Time */}
                <div className="col-12 col-md-6">
                  <label htmlFor="actionDateTimeInput" className="form-label small fw-semibold text-dark mb-1">
                    Action Date/Time <span className="text-danger">*</span>
                  </label>
                  <input
                    id="actionDateTimeInput"
                    ref={firstInputRef}
                    type="datetime-local"
                    className="form-control"
                    value={actionDateTime}
                    onChange={(e) => setActionDateTime(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="form-text small text-muted">When the technical diagnostic or repair occurred</div>
                </div>

                {/* 2. Performed By (Read-Only) */}
                <div className="col-12 col-md-6">
                  <label htmlFor="performedByInput" className="form-label small fw-semibold text-dark mb-1">
                    Performed By <span className="text-muted">(auto)</span>
                  </label>
                  <input
                    id="performedByInput"
                    type="text"
                    readOnly
                    className="zen-input zen-input-readonly form-control"
                    style={{ backgroundColor: "var(--color-input-bg-readonly, #EFEFEA)" }}
                    value={performerDisplayName}
                    aria-label="Performed by authenticated staff member"
                  />
                  <div className="form-text small text-muted">Authoritatively attributed from session credentials</div>
                </div>

                {/* Action Description */}
                <div className="col-12">
                  <label htmlFor="actionDescriptionInput" className="form-label small fw-semibold text-dark mb-1">
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="actionDescriptionInput"
                    rows={3}
                    className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                    placeholder="Describe the specific technical action performed..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (fieldErrors.description) {
                        setFieldErrors((prev) => ({ ...prev, description: "" }));
                      }
                    }}
                    disabled={isSubmitting}
                    required
                  />
                  {fieldErrors.description && (
                    <div className="invalid-feedback d-block">{fieldErrors.description}</div>
                  )}
                </div>

                {/* Result */}
                <div className="col-12">
                  <label htmlFor="actionResultInput" className="form-label small fw-semibold text-dark mb-1">
                    Result
                  </label>
                  <textarea
                    id="actionResultInput"
                    rows={2}
                    className={`form-control ${fieldErrors.result ? "is-invalid" : ""}`}
                    placeholder="Observed technical findings, test results, or outcome..."
                    value={result}
                    onChange={(e) => {
                      setResult(e.target.value);
                      if (fieldErrors.result) {
                        setFieldErrors((prev) => ({ ...prev, result: "" }));
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.result && (
                    <div className="invalid-feedback d-block">{fieldErrors.result}</div>
                  )}
                </div>

                {/* Follow-Up Required Toggle */}
                <div className="col-12">
                  <div className="form-check form-switch p-2 bg-light rounded border">
                    <input
                      className="form-check-input ms-0 me-2"
                      type="checkbox"
                      role="switch"
                      id="followUpSwitch"
                      checked={followUpRequired}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFollowUpRequired(checked);
                        if (!checked) {
                          setFollowUpNote("");
                          setFieldErrors((prev) => ({ ...prev, followUpNote: "" }));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <label className="form-check-label fw-semibold text-dark" htmlFor="followUpSwitch">
                      Follow-Up Required?
                    </label>
                    <div className="form-text small text-muted ms-1">
                      Check if this action requires additional monitoring, user verification, or subsequent diagnostics.
                    </div>
                  </div>
                </div>

                {/* Follow-Up Note (Dynamically shown when checked) */}
                {followUpRequired && (
                  <div className="col-12">
                    <label htmlFor="followUpNoteInput" className="form-label small fw-semibold text-dark mb-1">
                      Follow-Up Note <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="followUpNoteInput"
                      rows={2}
                      className={`form-control ${fieldErrors.followUpNote ? "is-invalid" : ""}`}
                      placeholder="Specify what follow-up action is required, target date, or criteria..."
                      value={followUpNote}
                      onChange={(e) => {
                        setFollowUpNote(e.target.value);
                        if (fieldErrors.followUpNote) {
                          setFieldErrors((prev) => ({ ...prev, followUpNote: "" }));
                        }
                      }}
                      disabled={isSubmitting}
                      required
                    />
                    {fieldErrors.followUpNote && (
                      <div className="invalid-feedback d-block">{fieldErrors.followUpNote}</div>
                    )}
                    <div className="form-text small text-muted">
                      Minimum 5 characters. Blocks ticket resolution until marked resolved.
                    </div>
                  </div>
                )}

                {/* Attachment Notes */}
                <div className="col-12">
                  <label htmlFor="attachmentNotesInput" className="form-label small fw-semibold text-dark mb-1">
                    Attachment Notes <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    id="attachmentNotesInput"
                    type="text"
                    className={`form-control ${fieldErrors.attachmentNotes ? "is-invalid" : ""}`}
                    placeholder="e.g., Refer to dock_diagnostic_log.txt or screenshot"
                    value={attachmentNotes}
                    onChange={(e) => {
                      setAttachmentNotes(e.target.value);
                      if (fieldErrors.attachmentNotes) {
                        setFieldErrors((prev) => ({ ...prev, attachmentNotes: "" }));
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.attachmentNotes && (
                    <div className="invalid-feedback d-block">{fieldErrors.attachmentNotes}</div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer bg-light border-top">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success d-flex align-items-center gap-2"
                disabled={isSubmitting}
                style={isSubmitting ? { pointerEvents: "none", opacity: 0.75 } : {}}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined fs-6">save</span>
                    <span>{isEditing ? "Update Action" : "Save Action"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
