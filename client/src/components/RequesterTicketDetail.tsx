import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { getTicketDetail, Ticket, Priority, TicketStatus } from "../api.js";
import AttachmentSection from "./AttachmentSection.js";

export default function RequesterTicketDetail() {
  const { requester, selectedTicketId, setSelectedTicketId, setActiveTab } = useRequester();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  const fetchTicket = useCallback(async () => {
    if (!requester || !selectedTicketId) {
      setTicket(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const data = await getTicketDetail(selectedTicketId, requester.id);
      setTicket(data);
    } catch (err: any) {
      if (err.status === 403 || err.code === "FORBIDDEN") {
        setIsForbidden(true);
        setError("Access denied. You do not own this ticket.");
      } else if (err.status === 404 || err.code === "NOT_FOUND") {
        setError("Ticket not found.");
      } else {
        setError(err.message || "Failed to load ticket details.");
      }
    } finally {
      setLoading(false);
    }
  }, [requester, selectedTicketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleBack = () => {
    setSelectedTicketId(null);
    setActiveTab("my-tickets");
  };

  const formatPriorityBadge = (p?: Priority) => {
    if (!p) return null;
    const classMap: Record<Priority, string> = {
      LOW: "badge-priority-low",
      MEDIUM: "badge-priority-medium",
      HIGH: "badge-priority-high",
      URGENT: "badge-priority-urgent",
    };
    return <span className={`badge ${classMap[p] || "bg-secondary"}`}>{p}</span>;
  };

  const formatStatusBadge = (s?: TicketStatus) => {
    if (!s) return null;
    const classMap: Record<TicketStatus, string> = {
      NEW: "badge-status-new",
      IN_PROGRESS: "badge-status-in-progress",
      PENDING: "badge-status-pending",
      RESOLVED: "badge-status-resolved",
      CLOSED: "badge-status-closed",
    };
    const label = s.replace("_", " ");
    return <span className={`badge ${classMap[s] || "bg-secondary"}`}>{label}</span>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
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
  };

  if (!requester) {
    return null;
  }

  if (loading) {
    return (
      <div className="zen-card p-5 text-center" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="text-muted small">Loading ticket details…</div>
      </div>
    );
  }

  if (error || isForbidden || !ticket) {
    return (
      <div className="zen-card p-4" data-testid="ticket-detail-error">
        <div className="d-flex align-items-center gap-2 mb-4">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handleBack}
          >
            <span className="material-symbols-outlined fs-6">arrow_back</span>
            Back to My Tickets
          </button>
        </div>

        <div className="alert alert-danger d-flex align-items-center gap-3 p-4 rounded" role="alert">
          <span className="material-symbols-outlined fs-2 text-danger">
            {isForbidden ? "lock" : "error"}
          </span>
          <div>
            <h2 className="h6 fw-bold mb-1">
              {isForbidden ? "Unauthorized Access Blocked" : "Unable to Load Ticket"}
            </h2>
            <p className="mb-0 small">
              {error || "The requested ticket could not be accessed."}
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <button type="button" className="btn btn-zen-primary" onClick={handleBack}>
            Return to Ticket List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zen-ticket-detail-container" data-testid="ticket-detail-view">
      {/* Navigation Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={handleBack}
          aria-label="Back to My Tickets"
        >
          <span className="material-symbols-outlined fs-6">arrow_back</span>
          Back to My Tickets
        </button>

        <span className="text-muted small">
          Ticket ID: #{ticket.id}
        </span>
      </div>

      {/* Ticket Header & Metadata Card */}
      <div className="zen-card p-4">
        {/* Ticket Header Banner */}
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4 pb-3 border-bottom">
          <div>
            <span className="badge bg-light text-muted border mb-1">Official Support Ticket</span>
            <h1 className="h3 fw-bold text-success mb-1">{ticket.ticketNumber}</h1>
            <p className="text-muted small mb-0">
              Submitted on {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div>
              <small className="text-muted d-block text-end mb-1">Current Status</small>
              {formatStatusBadge(ticket.currentStatus)}
            </div>
          </div>
        </div>

        {/* Read-Only Field Grid */}
        <div className="row g-3 mb-4">
          {/* Requester Identity */}
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">Requester</label>
            <input
              type="text"
              readOnly
              className="zen-input zen-input-readonly form-control"
              value={`${ticket.requester?.name || "Unknown"} (${ticket.requester?.email || ""})`}
              aria-label="Requester"
            />
          </div>

          {/* Category */}
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">Category</label>
            <input
              type="text"
              readOnly
              className="zen-input zen-input-readonly form-control"
              value={ticket.category?.name || "General Support"}
              aria-label="Category"
            />
          </div>

          {/* Related System */}
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">Related System</label>
            <input
              type="text"
              readOnly
              className="zen-input zen-input-readonly form-control"
              value={ticket.relatedSystem?.name || "Corporate Workstation"}
              aria-label="Related System"
            />
          </div>

          {/* Priorities */}
          <div className="col-6 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">Requested Priority</label>
            <div className="p-2 border rounded zen-input-readonly d-flex align-items-center justify-content-between">
              <span className="small fw-semibold">{ticket.requestedPriority}</span>
              {formatPriorityBadge(ticket.requestedPriority)}
            </div>
          </div>

          <div className="col-6 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">IT Assessed Priority</label>
            <div className="p-2 border rounded zen-input-readonly d-flex align-items-center justify-content-between">
              <span className="small fw-semibold">{ticket.itPriority}</span>
              {formatPriorityBadge(ticket.itPriority)}
            </div>
          </div>

          {/* Last Updated */}
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-muted mb-1">Last Updated</label>
            <input
              type="text"
              readOnly
              className="zen-input zen-input-readonly form-control"
              value={formatDate(ticket.updatedAt)}
              aria-label="Last Updated"
            />
          </div>
        </div>

        {/* Summary (Full-Width Read-Only) */}
        <div className="mb-3">
          <label className="form-label fw-semibold small text-muted mb-1">Summary</label>
          <input
            type="text"
            readOnly
            className="zen-input zen-input-readonly form-control fw-semibold"
            value={ticket.summary}
            aria-label="Ticket Summary"
          />
        </div>

        {/* Description (Full-Width Read-Only) */}
        <div className="mb-0">
          <label className="form-label fw-semibold small text-muted mb-1">Detailed Description</label>
          <textarea
            readOnly
            rows={5}
            className="zen-input zen-input-readonly form-control"
            value={ticket.description}
            aria-label="Ticket Description"
          />
        </div>
      </div>

      {/* Attachments Section */}
      <AttachmentSection
        ticketId={ticket.id}
        requesterId={requester.id}
        attachments={ticket.attachments || []}
        onAttachmentChanged={fetchTicket}
      />
    </div>
  );
}
