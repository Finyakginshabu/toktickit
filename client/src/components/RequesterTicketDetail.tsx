import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  getTicketDetail,
  indicateProblemResolved,
  getPublicComments,
  createPublicComment,
  Ticket,
  Priority,
  TicketStatus,
  PublicComment,
} from "../api.js";
import AttachmentSection from "./AttachmentSection.js";

export default function RequesterTicketDetail() {
  const { requester, selectedTicketId, setSelectedTicketId, setActiveTab } = useRequester();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Discussions & Resolution state
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  const [resolveFeedback, setResolveFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(null);

  const fetchComments = useCallback(async (ticketId: number) => {
    setCommentsLoading(true);
    try {
      const data = await getPublicComments(ticketId);
      setComments(data);
    } catch (_e) {
      // Non-blocking
    } finally {
      setCommentsLoading(false);
    }
  }, []);

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
      fetchComments(selectedTicketId);
    } catch (err: any) {
      if (err.status === 403 || err.code === "FORBIDDEN") {
        setIsForbidden(true);
        setError("Access denied. You do not own this ticket.");
      } else if (err.status === 404 || err.code === "NOT_FOUND") {
        setError("Ticket No.t found.");
      } else {
        setError(err.message || "Failed to load ticket details.");
      }
    } finally {
      setLoading(false);
    }
  }, [requester, selectedTicketId, fetchComments]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleIndicateResolved = async () => {
    if (!ticket) return;
    setResolveLoading(true);
    setResolveFeedback(null);
    try {
      await indicateProblemResolved(ticket.id);
      setTicket((prev) => (prev ? { ...prev, problemAppearsResolved: true, problemAppearsResolvedAt: new Date().toISOString() } : null));
      setResolveFeedback({
        type: "success",
        message: "Thank you! You indicated that this issue appears resolved. Support staff has been notified.",
      });
      fetchComments(ticket.id);
    } catch (err: any) {
      setResolveFeedback({
        type: "danger",
        message: err.message || "Failed to indicate problem resolved.",
      });
    } finally {
      setResolveLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentInput.trim()) return;

    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const newC = await createPublicComment(ticket.id, commentInput.trim());
      setComments((prev) => [...prev, newC]);
      setCommentInput("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

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
    const classMap: Partial<Record<TicketStatus, string>> = {
      NEW: "badge-status-new",
      OPEN: "badge-status-open",
      IN_PROGRESS: "badge-status-in-progress",
      WAITING_FOR_REQUESTER: "badge-status-waiting",
      PENDING: "badge-status-pending",
      RESOLVED: "badge-status-resolved",
      CLOSED: "badge-status-closed",
      REOPENED: "badge-status-reopened",
      CANCELLED: "badge-status-cancelled",
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
            {ticket.problemAppearsResolved ? (
              <span className="badge bg-success-subtle text-success border border-success-subtle p-2 d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-6">check_circle</span>
                Problem Appears Resolved
              </span>
            ) : ticket.currentStatus !== "RESOLVED" && ticket.currentStatus !== "CLOSED" ? (
              <button
                type="button"
                data-testid="indicate-resolved-btn"
                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                onClick={handleIndicateResolved}
                disabled={resolveLoading}
                title="Let IT staff know that this issue appears fixed"
              >
                {resolveLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" />
                ) : (
                  <span className="material-symbols-outlined fs-6">check_circle</span>
                )}
                <span>Problem Appears Resolved</span>
              </button>
            ) : null}

            <div>
              <small className="text-muted d-block text-end mb-1">Current Status</small>
              {formatStatusBadge(ticket.currentStatus)}
            </div>
          </div>
        </div>

        {resolveFeedback && (
          <div className={`alert alert-${resolveFeedback.type} alert-dismissible fade show small mb-3`} role="alert">
            {resolveFeedback.message}
            <button type="button" className="btn-close" onClick={() => setResolveFeedback(null)} aria-label="Close" />
          </div>
        )}

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
            <label className="form-label fw-semibold small text-muted mb-1">Priority</label>
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

      {/* Public Comments Thread */}
      <div className="zen-card p-4 mt-4" data-testid="requester-comments-section">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <div>
            <h2 className="h5 fw-bold text-success mb-0 d-flex align-items-center gap-2">
              <span className="material-symbols-outlined fs-5">forum</span>
              Public Comments
            </h2>
            <small className="text-muted">Communicate directly with the IT support team handling your ticket</small>
          </div>
          <span className="badge bg-light text-dark border">
            {comments.length} message{comments.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Comments Stream */}
        <div className="comments-thread mb-4" style={{ maxHeight: "350px", overflowY: "auto" }}>
          {commentsLoading && comments.length === 0 ? (
            <div className="text-center py-4 text-muted small">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-muted small fst-italic">
              No comments yet. Have more information or an update? Post a comment below.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {comments.map((c) => (
                <div key={c.id} className="p-3 bg-light rounded border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-semibold small text-dark">{c.author.name}</span>
                    <div className="d-flex align-items-center gap-1">
                      <span
                        className={`badge ${
                          c.author.role === "REQUESTER"
                            ? "badge-role-requester"
                            : "badge-role-staff"
                        }`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {c.author.role.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="mb-0 small text-break" style={{ whiteSpace: "pre-wrap" }}>
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment}>
          {commentError && (
            <div className="alert alert-danger p-2 small mb-2">{commentError}</div>
          )}
          <div className="mb-2">
            <label htmlFor="requesterComment" className="form-label small fw-semibold text-muted mb-1">
              Add a Comment
            </label>
            <textarea
              id="requesterComment"
              className="form-control form-control-sm"
              rows={3}
              placeholder="Provide additional details, answer staff questions, or request an update…"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              maxLength={2000}
              disabled={commentSubmitting}
            />
            <div className="d-flex justify-content-between align-items-center mt-1">
              <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                {commentInput.length}/2000 characters
              </small>
            </div>
          </div>
          <button
            type="submit"
            data-testid="requester-add-comment-btn"
            className="btn btn-sm btn-zen-primary ticket-action-button d-flex align-items-center gap-1"
            disabled={commentSubmitting || !commentInput.trim()}
          >
            {commentSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                <span>Posting…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined fs-6">send</span>
                <span>Send Comment</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
