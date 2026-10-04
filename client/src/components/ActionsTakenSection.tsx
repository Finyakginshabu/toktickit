import { useState, useEffect, useCallback, useRef } from "react";
import {
  ActionTaken,
  TicketStatus,
  getTicketActions,
} from "../api.js";
import ActionTakenModal from "./ActionTakenModal.js";

interface ActionsTakenSectionProps {
  ticketId: number;
  ticketStatus?: TicketStatus;
  isRequester?: boolean;
  embedded?: boolean;
  onActionCountChange?: (count: number) => void;
  onActionsChanged?: () => void;
}

function formatActionDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ActionsTakenSection({
  ticketId,
  ticketStatus,
  isRequester = false,
  embedded = false,
  onActionCountChange,
  onActionsChanged,
}: ActionsTakenSectionProps) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionToEdit, setActionToEdit] = useState<ActionTaken | null>(null);

  const addActionBtnRef = useRef<HTMLButtonElement>(null);
  const activeTriggerBtnRef = useRef<HTMLElement | null>(null);

  const isTicketLocked = ticketStatus === "CLOSED" || ticketStatus === "CANCELLED";

  const fetchActions = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketActions(ticketId);
      setActions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load actions taken for this ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    onActionCountChange?.(actions.length);
  }, [actions.length, onActionCountChange]);

  const handleOpenAddModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    activeTriggerBtnRef.current = e.currentTarget;
    setActionToEdit(null);
    setIsActionModalOpen(true);
  };

  const openEditModal = (action: ActionTaken, trigger: HTMLElement) => {
    activeTriggerBtnRef.current = trigger;
    setActionToEdit(action);
    setIsActionModalOpen(true);
  };

  const handleRowClick = (action: ActionTaken, e: React.MouseEvent<HTMLElement>) => {
    if (!isRequester && !isTicketLocked) openEditModal(action, e.currentTarget);
  };

  const handleRowKeyDown = (action: ActionTaken, e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || isRequester || isTicketLocked) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEditModal(action, e.currentTarget);
    }
  };

  const handleActionSaved = (savedAction: ActionTaken) => {
    setActions((prev) => {
      const index = prev.findIndex((a) => a.id === savedAction.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = savedAction;
        return copy;
      }
      return [...prev, savedAction];
    });
    onActionsChanged?.();
  };

  return (
    <div className={embedded ? "" : "zen-card p-4 mt-4"} data-testid="actions-taken-section">
      {/* Section Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
        <div>
          <h2 className="h5 fw-bold text-success mb-0 d-flex align-items-center gap-2">
            <span className="material-symbols-outlined fs-5">construction</span>
            <span>Actions Taken</span>
          </h2>
          <small className="text-muted">
            {isRequester
              ? "Detailed record of diagnostic and technical actions performed by the support team"
              : "Technical diagnostics, system configurations, and physical actions taken on this ticket"}
          </small>
        </div>

        {/* Toolbar: Staff Add Button */}
        {!isRequester && (
          <div>
            <button
              ref={addActionBtnRef}
              type="button"
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
              onClick={handleOpenAddModal}
              disabled={isTicketLocked}
              title={isTicketLocked ? "Cannot add actions to a closed or cancelled ticket" : "Record an action taken"}
            >
              <span className="material-symbols-outlined fs-6">add</span>
              <span>Add Action Taken</span>
            </button>
          </div>
        )}
      </div>

      {/* State 1: Safe Failure Banner */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-3" role="alert">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined fs-5">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={fetchActions}
          >
            <span className="material-symbols-outlined fs-6">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* State 2: Loading Skeleton Placeholder */}
      {loading && actions.length === 0 && (
        <div data-testid="actions-loading-skeleton" className="py-2">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="p-3 mb-2 border rounded bg-white">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="skeleton-shimmer" style={{ width: "160px", height: "18px" }} />
                <div className="skeleton-shimmer" style={{ width: "90px", height: "20px" }} />
              </div>
              <div className="skeleton-shimmer mb-2" style={{ width: "80%", height: "16px" }} />
              <div className="skeleton-shimmer" style={{ width: "45%", height: "14px" }} />
            </div>
          ))}
        </div>
      )}

      {/* State 3: Empty State */}
      {!loading && !error && actions.length === 0 && (
        <div className="text-center py-5 px-3 bg-light rounded border" data-testid="actions-empty-state">
          <span className="material-symbols-outlined fs-1 text-muted mb-2"></span>
          <p className="text-center py-4 text-muted small fst-italic">
            No actions taken recorded yet for this ticket. Use the button above to record technical diagnostics or actions.
          </p>
          {!isRequester && !isTicketLocked && (
            <button
              type="button"
              className="btn btn-sm btn-outline-success mt-2"
              onClick={handleOpenAddModal}
            >
              + Record First Action
            </button>
          )}
        </div>
      )}

      {/* State 4: Populated Actions List */}
      {!loading && actions.length > 0 && (
        <>
          {/* Desktop & Tablet Table (>= 768px) */}
          <div className="table-responsive d-none d-md-block mb-3">
            <table className="table table-hover align-middle mb-0 zen-table">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "150px" }}>Date/Time</th>
                  <th style={{ minWidth: "220px" }}>Action Description</th>
                  <th style={{ minWidth: "180px" }}>Result</th>
                  <th style={{ minWidth: "130px" }}>Performed By</th>
                  <th style={{ minWidth: "150px" }}>Follow-Up</th>
                  <th style={{ minWidth: "150px" }}>Attachment Notes</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((act) => {
                  return (
                    <tr
                      key={act.id}
                      data-testid={`action-row-${act.id}`}
                      onClick={(e) => handleRowClick(act, e)}
                      onKeyDown={(e) => handleRowKeyDown(act, e)}
                      tabIndex={!isRequester && !isTicketLocked ? 0 : undefined}
                      aria-label={!isRequester ? `Edit action: ${act.actionDescription}` : undefined}
                      style={{ cursor: !isRequester && !isTicketLocked ? "pointer" : undefined }}
                    >
                      <td className="text-muted small text-nowrap">{formatActionDateTime(act.actionDateTime)}</td>

                      <td style={{ maxWidth: "260px" }}>
                        <div className="text-break">{act.actionDescription}</div>
                      </td>

                      <td style={{ maxWidth: "200px" }}>
                        <div className="text-break">{act.result || "—"}</div>
                      </td>

                      <td>
                        <span className="badge bg-light text-dark border d-inline-block text-truncate" style={{ maxWidth: "120px" }}>
                          {act.performedBy?.name || "Staff"}
                        </span>
                      </td>

                      <td>
                        {act.followUpRequired ? (
                          <div className="text-break" style={{ whiteSpace: "pre-wrap" }}>
                            {act.followUpNote}
                          </div>
                        ) : (
                          <span className="text-muted">Not Required</span>
                        )}
                      </td>

                      <td style={{ maxWidth: "180px" }} className="text-truncate">
                        {act.attachmentNotes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout (< 768px) */}
          <div className="d-block d-md-none">
            <div className="d-flex flex-column gap-3">
              {actions.map((act) => {
                return (
                  <article
                    key={act.id}
                    className="zen-ticket-card"
                    data-testid={`action-card-${act.id}`}
                    onClick={(e) => handleRowClick(act, e)}
                    onKeyDown={(e) => handleRowKeyDown(act, e)}
                    tabIndex={!isRequester && !isTicketLocked ? 0 : undefined}
                    aria-label={!isRequester ? `Edit action: ${act.actionDescription}` : undefined}
                    style={{ cursor: !isRequester && !isTicketLocked ? "pointer" : undefined }}
                  >
                    <div className="mb-2">
                      <div className="small fw-semibold text-muted">Date:</div>
                      <span className="text-muted small">{formatActionDateTime(act.actionDateTime)}</span>
                    </div>

                    <div className="mb-2">
                      <div className="small fw-semibold text-muted">Description:</div>
                      <div className="text-break">{act.actionDescription}</div>
                    </div>

                    {act.result && (
                      <div className="mb-2">
                        <div className="small fw-semibold text-muted">Result:</div>
                        <div className="text-break">{act.result}</div>
                      </div>
                    )}

                    <div className="d-flex flex-wrap gap-2 mb-2 small">
                      <div>
                        <span className="text-muted me-1">Performed By:</span>
                        <span className="badge bg-light text-muted border small">{act.performedBy?.name || "Staff"}</span>
                      </div>
                    </div>

                    {act.attachmentNotes && (
                      <div className="mb-2 small text-muted">
                        <span className="fw-semibold">Attachment Notes:</span> {act.attachmentNotes}
                      </div>
                    )}

                    {/* Mobile Follow-Up */}
                    {act.followUpRequired && (
                      <div className="mb-2 text-break" style={{ whiteSpace: "pre-wrap" }}>
                        {act.followUpNote}
                      </div>
                    )}

                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <ActionTakenModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        ticketId={ticketId}
        actionToEdit={actionToEdit}
        onActionSaved={handleActionSaved}
        triggerButtonRef={activeTriggerBtnRef.current}
      />

    </div>
  );
}
