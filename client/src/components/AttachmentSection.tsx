import React, { useState, useRef } from "react";
import { Attachment } from "../types/index.js";
import { addAttachment, softRemoveAttachment, getAttachmentDownloadUrl } from "../api.js";

interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  attachments: Attachment[];
  onAttachmentChanged: () => void;
}

const MAX_ACTIVE_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string, fileName: string): string {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return "picture_as_pdf";
  }
  if (
    mimeType.startsWith("image/") ||
    /\.(jpe?g|png|webp)$/i.test(fileName)
  ) {
    return "image";
  }
  return "insert_drive_file";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function AttachmentSection({
  ticketId,
  requesterId,
  attachments,
  onAttachmentChanged,
}: AttachmentSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Soft removal modal states
  const [targetAttachment, setTargetAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAttachments = attachments.filter((a) => !a.isRemoved);
  const softRemovedAttachments = attachments.filter((a) => a.isRemoved);
  const activeCount = activeAttachments.length;
  const isCapReached = activeCount >= MAX_ACTIVE_ATTACHMENTS;

  const validateFile = (file: File): string | null => {
    if (file.size === 0) {
      return "Empty (0-byte) files cannot be uploaded.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "Attachment exceeds the 5 MB limit.";
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
    if (!isValidType) {
      return "Only JPG, PNG, WEBP, and PDF files are permitted.";
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    if (isCapReached) {
      setUploadError("Maximum 5 active attachments reached.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await addAttachment(ticketId, requesterId, file);
      onAttachmentChanged();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isCapReached) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const openRemovalModal = (att: Attachment) => {
    setTargetAttachment(att);
    setRemovalReason("");
    setRemovalError(null);
  };

  const closeRemovalModal = () => {
    setTargetAttachment(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleConfirmRemoval = async () => {
    if (!targetAttachment) return;
    const trimmed = removalReason.trim();
    if (trimmed.length < 3) {
      setRemovalError("A removal reason of at least 3 characters is required.");
      return;
    }

    setRemoving(true);
    setRemovalError(null);

    try {
      await softRemoveAttachment(targetAttachment.id, requesterId, trimmed);
      closeRemovalModal();
      onAttachmentChanged();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="zen-card p-4 mt-4" data-testid="attachment-section">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
          <span className="material-symbols-outlined text-success">attach_file</span>
          Attachments ({activeCount}/{MAX_ACTIVE_ATTACHMENTS})
        </h2>
        {isCapReached && (
          <span className="badge bg-warning text-dark border d-flex align-items-center gap-1">
            <span className="material-symbols-outlined fs-6">warning</span>
            Active limit reached
          </span>
        )}
      </div>

      {/* Upload Dropzone / Button */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          className="d-none"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelect}
          disabled={isCapReached || uploading}
          aria-label="Upload attachment file"
          data-testid="file-input"
        />

        <div
          className={`p-3 border rounded text-center transition-all ${
            isCapReached
              ? "bg-light text-muted border-secondary opacity-75 cursor-not-allowed"
              : isDragOver
              ? "border-success bg-white shadow-sm"
              : "border-dashed bg-light"
          }`}
          style={{ borderStyle: "dashed", borderWidth: "2px" }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isCapReached) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="d-flex flex-column align-items-center gap-2">
            <span
              className={`material-symbols-outlined fs-2 ${
                isCapReached ? "text-muted" : "text-success"
              }`}
            >
              {isCapReached ? "block" : "cloud_upload"}
            </span>

            {isCapReached ? (
              <div>
                <p className="fw-semibold mb-0 text-muted">
                  Maximum 5 active attachments reached.
                </p>
                <small className="text-muted">
                  Soft-remove an attachment to upload additional files.
                </small>
              </div>
            ) : (
              <div>
                <p className="fw-semibold mb-1">
                  Drag and drop a file here, or{" "}
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-semibold text-success align-baseline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    browse to upload
                  </button>
                </p>
                <small className="text-muted d-block">
                  Allowed formats: PNG, JPG, WEBP, PDF (Max 5 MB each)
                </small>
              </div>
            )}

            {uploading && (
              <div className="d-flex align-items-center gap-2 text-success mt-2">
                <div className="spinner-border spinner-border-sm" role="status" />
                <span className="small">Uploading attachment…</span>
              </div>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="alert alert-danger py-2 px-3 mt-2 d-flex align-items-center gap-2 small" role="alert">
            <span className="material-symbols-outlined fs-6">error</span>
            <div>{uploadError}</div>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-muted small mb-0 text-center py-3">
          No attachments uploaded for this ticket.
        </p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {/* Active Attachments */}
          {activeAttachments.map((att) => (
            <div
              key={att.id}
              className="d-flex flex-wrap justify-content-between align-items-center p-3 border rounded bg-white shadow-sm gap-2"
              data-testid={`attachment-item-${att.id}`}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded bg-light border text-success d-flex align-items-center justify-content-center">
                  <span className="material-symbols-outlined fs-4">
                    {getFileIcon(att.mimeType, att.originalName)}
                  </span>
                </div>
                <div>
                  <div className="fw-semibold text-dark text-break">{att.originalName}</div>
                  <div className="text-muted small d-flex align-items-center gap-2">
                    <span>{formatFileSize(att.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(att.uploadedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <a
                  href={getAttachmentDownloadUrl(att.id, requesterId)}
                  download={att.originalName}
                  className="btn btn-sm btn-zen-secondary d-flex align-items-center gap-1"
                  aria-label={`Download ${att.originalName}`}
                >
                  <span className="material-symbols-outlined fs-6">download</span>
                  Download
                </a>
                <button
                  type="button"
                  className="btn btn-sm btn-zen-destructive d-flex align-items-center gap-1"
                  onClick={() => openRemovalModal(att)}
                  aria-label={`Remove ${att.originalName}`}
                >
                  <span className="material-symbols-outlined fs-6">delete</span>
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Soft-Removed Attachments */}
          {softRemovedAttachments.map((att) => (
            <div
              key={att.id}
              className="d-flex flex-wrap justify-content-between align-items-center p-3 border rounded bg-light text-muted gap-2 opacity-75"
              data-testid={`attachment-item-${att.id}`}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded bg-white border text-muted d-flex align-items-center justify-content-center">
                  <span className="material-symbols-outlined fs-4">
                    {getFileIcon(att.mimeType, att.originalName)}
                  </span>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-medium text-decoration-line-through text-break">
                      {att.originalName}
                    </span>
                    <span className="badge bg-danger text-white">Removed</span>
                  </div>
                  <div className="text-muted small mt-1">
                    <span>Size: {formatFileSize(att.fileSize)}</span>
                    {att.removedReason && (
                      <span className="ms-2 fst-italic">
                        Reason: {att.removedReason}
                      </span>
                    )}
                    {att.removedAt && (
                      <span className="ms-2">
                        ({formatDate(att.removedAt)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary disabled"
                  disabled
                  title="This file has been removed and cannot be downloaded"
                  aria-label={`Download disabled for ${att.originalName}`}
                >
                  <span className="material-symbols-outlined fs-6 me-1">block</span>
                  Download Blocked
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Soft Removal Confirmation Modal */}
      {targetAttachment && (
        <div className="zen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="zen-card p-4 shadow-lg w-100" style={{ maxWidth: 480 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 id="modal-title" className="h5 fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                <span className="material-symbols-outlined">delete_forever</span>
                Remove Attachment
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={closeRemovalModal}
                disabled={removing}
                aria-label="Close modal"
              />
            </div>

            <p className="small text-muted mb-3">
              Are you sure you want to remove <strong>{targetAttachment.originalName}</strong>?
              The file metadata will remain visible in the audit trail, but file binary downloads will be permanently blocked.
            </p>

            <div className="mb-3">
              <label htmlFor="removal-reason" className="form-label fw-semibold small">
                Removal Reason <span className="text-danger">*</span> (min 3 characters)
              </label>
              <textarea
                id="removal-reason"
                className={`zen-input ${removalError ? "zen-input-error" : ""}`}
                rows={3}
                placeholder="e.g. Uploaded outdated battery diagnostic report"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                disabled={removing}
                aria-required="true"
              />
              <div className="d-flex justify-content-between small text-muted mt-1">
                <span>Must provide a valid business reason</span>
                <span>{removalReason.trim().length} chars</span>
              </div>
              {removalError && <div className="zen-error-text">{removalError}</div>}
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={closeRemovalModal}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                onClick={handleConfirmRemoval}
                disabled={removing || removalReason.trim().length < 3}
              >
                {removing ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status" />
                    <span>Removing…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined fs-6">check</span>
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
