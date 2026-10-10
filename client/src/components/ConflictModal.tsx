import { useEffect } from "react";
import { ConflictErrorPayload } from "../types/index.js";

interface ConflictModalProps {
  isOpen: boolean;
  conflictData?: ConflictErrorPayload | null;
  onReload: () => void;
  onKeepInput: () => void;
}

export default function ConflictModal({
  isOpen,
  conflictData,
  onReload,
  onKeepInput,
}: ConflictModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onKeepInput();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onKeepInput]);

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div
            className="modal-header text-white"
            style={{ backgroundColor: "var(--color-warning, #975A16)" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="material-symbols-outlined fs-4">sync_problem</span>
              <h2 className="modal-title h5 mb-0 fw-bold" id="conflict-modal-title">
                Workflow Update Conflict
              </h2>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onKeepInput}
              aria-label="Close"
              data-testid="conflict-modal-close-btn"
            />
          </div>

          <div className="modal-body p-4">
            <div className="d-flex align-items-start gap-3 mb-3">
              <span className="material-symbols-outlined fs-2 text-warning">warning</span>
              <div>
                <p className="mb-2 fw-medium text-dark">
                  Another staff member updated this ticket while you were working.
                </p>
                <p className="text-muted small mb-0">
                  Your entered notes and resolution summary have been preserved without loss. You can
                  reload the latest ticket state or keep your entered inputs to review changes.
                </p>
              </div>
            </div>

            {conflictData && (
              <div
                className="p-3 rounded small mb-2"
                style={{ backgroundColor: "#FEFCBF", border: "1px solid #ECC94B" }}
                data-testid="conflict-server-details"
              >
                <div className="fw-semibold text-dark mb-1">Latest Server Record:</div>
                <ul className="list-unstyled mb-0 text-secondary">
                  <li>
                    Status: <strong className="text-dark">{conflictData.currentStatus}</strong>
                  </li>
                  <li>
                    Record Version: <strong className="text-dark">v{conflictData.version}</strong>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onKeepInput}
              data-testid="conflict-keep-input-btn"
            >
              Keep My Input
            </button>
            <button
              type="button"
              className="btn btn-zen-primary d-inline-flex align-items-center gap-1"
              onClick={onReload}
              data-testid="conflict-reload-latest-btn"
            >
              <span className="material-symbols-outlined fs-6">refresh</span>
              <span>Reload Latest</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
