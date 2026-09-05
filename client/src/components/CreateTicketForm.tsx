import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { getCategories, getRelatedSystems, createTicket, Category, RelatedSystem, Priority, Ticket } from "../api.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function CreateTicketForm() {
  const { requester, setActiveTab } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState<boolean>(true);

  // Form Fields
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState<Priority>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  // UI States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    async function loadRefData() {
      setLoadingRefData(true);
      try {
        const [cats, systems] = await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);
        setCategories(cats);
        setRelatedSystems(systems);
        if (cats.length > 0) setCategoryId(cats[0].id);
        if (systems.length > 0) setRelatedSystemId(systems[0].id);
      } catch (_err) {
        setGeneralError("Failed to load reference data. Please check backend connection.");
      } finally {
        setLoadingRefData(false);
      }
    }
    loadRefData();
  }, []);

  function handleFileSelection(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    setAttachmentError(null);

    const newFiles: File[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();

      if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`"${file.name}" is not a supported file type. Allowed: JPG, PNG, WEBP, PDF.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`"${file.name}" exceeds the 5 MB limit.`);
        return;
      }

      newFiles.push(file);
    }

    if (files.length + newFiles.length > 5) {
      setAttachmentError("Maximum 5 attachments allowed per ticket.");
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!categoryId) {
      errors.categoryId = "Please select a category.";
    }
    if (!relatedSystemId) {
      errors.relatedSystemId = "Please select an affected system.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      errors.summary = "Ticket summary is required.";
    } else if (trimmedSummary.length < 5) {
      errors.summary = "Summary must be at least 5 characters.";
    } else if (trimmedSummary.length > 100) {
      errors.summary = "Summary must not exceed 100 characters.";
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      errors.description = "Detailed description is required.";
    } else if (trimmedDescription.length < 10) {
      errors.description = "Description must be at least 10 characters.";
    } else if (trimmedDescription.length > 2000) {
      errors.description = "Description must not exceed 2000 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!requester) {
      setGeneralError("Please select a Development Requester first.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("requesterId", String(requester.id));
      formData.append("categoryId", String(categoryId));
      formData.append("relatedSystemId", String(relatedSystemId));
      formData.append("requestedPriority", requestedPriority);
      formData.append("summary", summary.trim());
      formData.append("description", description.trim());

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const ticket = await createTicket(formData);
      setCreatedTicket(ticket);
    } catch (err: any) {
      setGeneralError(err.message || "Failed to submit ticket.");
      if (err.details && Array.isArray(err.details)) {
        const backendFieldErrors: Record<string, string> = {};
        err.details.forEach((d: { field: string; message: string }) => {
          backendFieldErrors[d.field] = d.message;
        });
        setFieldErrors(backendFieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setCreatedTicket(null);
    setSummary("");
    setDescription("");
    setFiles([]);
    setFieldErrors({});
    setGeneralError(null);
    setAttachmentError(null);
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (relatedSystems.length > 0) setRelatedSystemId(relatedSystems[0].id);
    setRequestedPriority("MEDIUM");
  }

  // Success Confirmation View
  if (createdTicket) {
    return (
      <div className="zen-card p-4 text-center">
        <div className="mb-3">
          <span className="material-symbols-outlined fs-1 text-success">check_circle</span>
        </div>
        <h2 className="h4 fw-bold text-success mb-2">Ticket Submitted Successfully!</h2>
        <p className="text-muted mb-4">
          Your request has been received and assigned an official tracking number.
        </p>

        <div className="zen-callout-info d-inline-block text-start p-3 mb-4 mx-auto" style={{ maxWidth: 480 }}>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Ticket Number:</span>
            <strong className="text-success fs-5">{createdTicket.ticketNumber}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Status:</span>
            <span className="badge bg-success">{createdTicket.currentStatus}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Summary:</span>
            <span className="text-dark fw-semibold">{createdTicket.summary}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Attachments:</span>
            <span>{createdTicket.attachments?.length ?? 0} file(s) attached</span>
          </div>
        </div>

        <div className="d-flex justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-zen-secondary"
            onClick={handleReset}
          >
            Create Another Ticket
          </button>
          <button
            type="button"
            className="btn btn-zen-primary"
            onClick={() => setActiveTab("my-tickets")}
          >
            View in My Tickets →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zen-card p-4">
      <div className="mb-4 pb-2 border-bottom">
        <h1 className="h4 fw-bold mb-1">Create IT Support Ticket</h1>
        <p className="text-muted mb-0">
          Submitting request as: <strong className="text-dark">{requester?.name ?? "Guest"}</strong> ({requester?.department ?? "No Department"})
        </p>
      </div>

      {generalError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <span className="material-symbols-outlined">error</span>
          <div>{generalError}</div>
        </div>
      )}

      {loadingRefData ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
          Loading form options...
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* Row 1: Category & Related System */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="ticket-category" className="form-label fw-semibold">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="ticket-category"
                className={`form-select zen-input ${fieldErrors.categoryId ? "zen-input-error" : ""}`}
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                disabled={isSubmitting}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && <div className="zen-error-text">{fieldErrors.categoryId}</div>}
            </div>

            <div className="col-md-6">
              <label htmlFor="ticket-system" className="form-label fw-semibold">
                Related System / Device <span className="text-danger">*</span>
              </label>
              <select
                id="ticket-system"
                className={`form-select zen-input ${fieldErrors.relatedSystemId ? "zen-input-error" : ""}`}
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(Number(e.target.value))}
                disabled={isSubmitting}
              >
                {relatedSystems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>
              {fieldErrors.relatedSystemId && <div className="zen-error-text">{fieldErrors.relatedSystemId}</div>}
            </div>
          </div>

          {/* Row 2: Requested Priority */}
          <div className="mb-3">
            <label htmlFor="ticket-priority" className="form-label fw-semibold">
              Requested Priority <span className="text-danger">*</span>
            </label>
            <div className="row g-2">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                <div key={p} className="col-6 col-md-3">
                  <button
                    type="button"
                    className={`btn w-100 text-center py-2 ${
                      requestedPriority === p ? "btn-zen-primary" : "btn-outline-secondary"
                    }`}
                    onClick={() => setRequestedPriority(p)}
                    disabled={isSubmitting}
                  >
                    {p}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Summary */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <label htmlFor="ticket-summary" className="form-label fw-semibold mb-1">
                Summary / Short Title <span className="text-danger">*</span>
              </label>
              <small className={`text-muted ${summary.length > 100 ? "text-danger fw-bold" : ""}`}>
                {summary.length} / 100
              </small>
            </div>
            <input
              id="ticket-summary"
              type="text"
              className={`zen-input ${fieldErrors.summary ? "zen-input-error" : ""}`}
              placeholder="e.g. Laptop battery drains quickly during video calls"
              value={summary}
              maxLength={100}
              onChange={(e) => setSummary(e.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.summary && <div className="zen-error-text">{fieldErrors.summary}</div>}
          </div>

          {/* Row 4: Description */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <label htmlFor="ticket-description" className="form-label fw-semibold mb-1">
                Detailed Description <span className="text-danger">*</span>
              </label>
              <small className={`text-muted ${description.length > 2000 ? "text-danger fw-bold" : ""}`}>
                {description.length} / 2000
              </small>
            </div>
            <textarea
              id="ticket-description"
              className={`zen-input ${fieldErrors.description ? "zen-input-error" : ""}`}
              rows={5}
              placeholder="Describe the problem, error messages, steps to reproduce, and any troubleshooting already attempted..."
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.description && <div className="zen-error-text">{fieldErrors.description}</div>}
          </div>

          {/* Row 5: Attachments Dropzone */}
          <div className="mb-4">
            <label className="form-label fw-semibold">
              Attachments <span className="text-muted fw-normal">(Optional, max 5 files, ≤ 5 MB each)</span>
            </label>

            <div
              className={`border border-2 border-dashed rounded p-3 text-center transition-all ${
                isDragging
                  ? "border-success bg-white shadow-sm"
                  : "bg-light"
              }`}
              style={{
                borderColor: isDragging ? "var(--color-primary-green)" : "#D8E2DC",
                backgroundColor: isDragging ? "var(--color-pale-green)" : "#F8F9FA",
                cursor: "pointer",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting && files.length < 5) setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting && files.length < 5) setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (!isSubmitting && files.length < 5) {
                  handleFileSelection(e.dataTransfer.files);
                }
              }}
            >
              <span className={`material-symbols-outlined fs-2 mb-1 ${isDragging ? "text-success" : "text-muted"}`}>
                upload_file
              </span>
              <p className={`small mb-2 ${isDragging ? "text-success fw-semibold" : "text-muted"}`}>
                {isDragging
                  ? "Drop files here to attach..."
                  : "Drag and drop files here, or click below to browse (JPG, PNG, WEBP, PDF)"}
              </p>
              <input
                id="ticket-file-input"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="d-none"
                disabled={isSubmitting || files.length >= 5}
                onChange={(e) => handleFileSelection(e.target.files)}
              />
              <label
                htmlFor="ticket-file-input"
                className={`btn btn-sm ${files.length >= 5 ? "btn-secondary disabled" : "btn-zen-secondary"}`}
              >
                <span className="material-symbols-outlined fs-6 me-1">attach_file</span>
                {files.length >= 5 ? "Attachment Limit Reached (5/5)" : "Choose Files"}
              </label>
            </div>

            {attachmentError && (
              <div className="zen-error-text mt-2 d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-6">warning</span>
                <span>{attachmentError}</span>
              </div>
            )}

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-3">
                <div className="small fw-semibold text-muted mb-2">Selected Files ({files.length}/5):</div>
                <div className="list-group">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                    >
                      <div className="d-flex align-items-center gap-2 text-truncate">
                        <span className="material-symbols-outlined text-success fs-5">
                          {file.type.includes("pdf") ? "picture_as_pdf" : "image"}
                        </span>
                        <span className="text-truncate small">{file.name}</span>
                        <span className="badge bg-light text-muted border">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0 ms-2"
                        onClick={() => removeFile(idx)}
                        disabled={isSubmitting}
                        aria-label={`Remove ${file.name}`}
                      >
                        <span className="material-symbols-outlined fs-5">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="d-flex justify-content-end gap-2 pt-2 border-top">
            <button
              type="button"
              className="btn btn-zen-secondary"
              onClick={() => setActiveTab("my-tickets")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-zen-primary d-flex align-items-center gap-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined fs-6">send</span>
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
