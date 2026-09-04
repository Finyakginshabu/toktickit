import { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { RequesterUser } from "../types/index.js";

export default function RequesterSelectorModal() {
  const {
    requester,
    availableRequesters,
    loadingRequesters,
    requesterError,
    isSelectorOpen,
    setRequester,
    closeSelector,
    refreshRequesters,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<number | "">("");

  useEffect(() => {
    if (requester) {
      setSelectedId(requester.id);
    } else if (availableRequesters.length > 0) {
      setSelectedId(availableRequesters[0].id);
    }
  }, [requester, availableRequesters]);

  if (!isSelectorOpen) {
    return null;
  }

  function handleContinue() {
    if (selectedId === "") return;
    const selected = availableRequesters.find((r) => r.id === Number(selectedId));
    if (selected) {
      setRequester(selected);
    }
  }

  return (
    <div className="zen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="zen-card p-4 shadow-lg" style={{ maxWidth: 540, width: "100%" }}>
        <div className="d-flex align-items-center mb-3">
          <span className="material-symbols-outlined fs-1 text-success me-2">account_circle</span>
          <div>
            <h2 id="modal-title" className="h5 fw-bold mb-0 text-success">
              Select Development Requester
            </h2>
            <small className="text-muted">Simulate user identity for Lab 2 ticketing MVP</small>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="zen-callout-info mb-3 d-flex align-items-start gap-2">
          <span className="material-symbols-outlined text-success mt-1">info</span>
          <div>
            <strong>Lab 2 Development Mode:</strong> Choose a simulated Requester context for creating and managing tickets. Full authentication and passwords will be introduced in Lab 3.
          </div>
        </div>

        {/* Loading State */}
        {loadingRequesters && (
          <div className="text-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
            Loading active requesters...
          </div>
        )}

        {/* Error State */}
        {requesterError && !loadingRequesters && (
          <div className="alert alert-danger py-2 mb-3">
            <div>{requesterError}</div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger mt-2"
              onClick={refreshRequesters}
            >
              Retry
            </button>
          </div>
        )}

        {/* Selector Form */}
        {!loadingRequesters && availableRequesters.length > 0 && (
          <div className="mb-4">
            <label htmlFor="requester-dropdown" className="form-label fw-semibold">
              Development Requester <span className="text-danger">*</span>
            </label>
            <select
              id="requester-dropdown"
              className="form-select zen-input"
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {availableRequesters.map((req: RequesterUser) => (
                <option key={req.id} value={req.id}>
                  {req.name} ({req.department ?? req.email})
                </option>
              ))}
            </select>
            <small className="text-muted d-flex align-items-center gap-1 mt-1">
              <span className="material-symbols-outlined fs-6">check_circle</span>
              Only active Development Requesters are available.
            </small>
          </div>
        )}

        {/* Empty State */}
        {!loadingRequesters && !requesterError && availableRequesters.length === 0 && (
          <div className="alert alert-warning py-2 mb-3 d-flex align-items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            <span>No active development requesters found in the database. Please run the seed script.</span>
          </div>
        )}

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2">
          {requester && (
            <button
              type="button"
              className="btn btn-zen-secondary"
              onClick={closeSelector}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn-zen-primary d-flex align-items-center gap-1"
            disabled={loadingRequesters || selectedId === "" || availableRequesters.length === 0}
            onClick={handleContinue}
          >
            <span>Continue</span>
            <span className="material-symbols-outlined fs-6">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
