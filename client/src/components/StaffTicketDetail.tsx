import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";
import {
  getTicketDetail,
  claimOrAssignTicket,
  updateTicketPriority,
  updateTicketStatus,
  getPublicComments,
  createPublicComment,
  getInternalNotes,
  createInternalNote,
  getActiveStaffUsers,
  Ticket,
  User,
  Priority,
  TicketStatus,
  PublicComment,
  InternalNote,
} from "../api.js";
import AttachmentSection from "./AttachmentSection.js";

const PERMITTED_NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: ["REOPENED"],
  PENDING: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
};

export default function StaffTicketDetail() {
  const { selectedTicketId, setSelectedTicketId, setActiveTab } = useRequester();
  const { user: authUser } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStaff, setActiveStaff] = useState<User[]>([]);

  // Discussions states
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);

  // Form states for adding comment & note
  const [commentInput, setCommentInput] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [noteInput, setNoteInput] = useState<string>("");
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Operations busy state
  const [opLoading, setOpLoading] = useState<boolean>(false);
  const [opFeedback, setOpFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(null);

  // Status transition confirmation modal state
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState<string>("");
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    if (!selectedTicketId) {
      setTicket(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTicketDetail(selectedTicketId);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [selectedTicketId]);

  // Fetch discussions (Comments & Notes)
  const fetchDiscussions = useCallback(async () => {
    if (!selectedTicketId) return;

    setCommentsLoading(true);
    setNotesLoading(true);

    try {
      const [fetchedComments, fetchedNotes] = await Promise.all([
        getPublicComments(selectedTicketId).catch(() => []),
        getInternalNotes(selectedTicketId).catch(() => []),
      ]);
      setComments(fetchedComments);
      setNotes(fetchedNotes);
    } finally {
      setCommentsLoading(false);
      setNotesLoading(false);
    }
  }, [selectedTicketId]);

  // Fetch active staff directory for owner dropdown
  useEffect(() => {
    async function loadStaff() {
      try {
        const staff = await getActiveStaffUsers();
        setActiveStaff(staff);
      } catch (_e) {
        // Non-blocking if directory fails to load
      }
    }
    loadStaff();
  }, []);

  useEffect(() => {
    fetchTicket();
    fetchDiscussions();
  }, [fetchTicket, fetchDiscussions]);

  const handleBack = () => {
    setSelectedTicketId(null);
    setActiveTab("ticket-queue");
  };

  // Operational: Claim Ticket
  const handleClaim = async () => {
    if (!ticket || !authUser) return;
    setOpLoading(true);
    setOpFeedback(null);
    try {
      await claimOrAssignTicket(ticket.id, authUser.id);
      setOpFeedback({ type: "success", message: `Ticket successfully claimed by ${authUser.name}.` });
      await fetchTicket();
    } catch (err: any) {
      setOpFeedback({ type: "danger", message: err.message || "Failed to claim ticket." });
    } finally {
      setOpLoading(false);
    }
  };

  // Operational: Reassign Owner via dropdown
  const handleOwnerChange = async (newOwnerIdStr: string) => {
    if (!ticket) return;
    const newOwnerId = parseInt(newOwnerIdStr, 10);
    if (isNaN(newOwnerId)) return;

    setOpLoading(true);
    setOpFeedback(null);
    try {
      await claimOrAssignTicket(ticket.id, newOwnerId);
      const assignedUser = activeStaff.find((s) => s.id === newOwnerId);
      setOpFeedback({
        type: "success",
        message: `Ticket successfully assigned to ${assignedUser?.name || "selected staff"}.`,
      });
      await fetchTicket();
    } catch (err: any) {
      setOpFeedback({ type: "danger", message: err.message || "Failed to reassign ticket." });
    } finally {
      setOpLoading(false);
    }
  };

  // Operational: Update IT Priority
  const handlePriorityChange = async (newPriority: Priority) => {
    if (!ticket) return;
    setOpLoading(true);
    setOpFeedback(null);
    try {
      await updateTicketPriority(ticket.id, newPriority);
      setOpFeedback({ type: "success", message: `IT Priority updated to ${newPriority}.` });
      await fetchTicket();
    } catch (err: any) {
      setOpFeedback({ type: "danger", message: err.message || "Failed to update IT Priority." });
    } finally {
      setOpLoading(false);
    }
  };

  // Operational: Initiate Status Transition (opens confirmation modal)
  const handleSelectStatus = (newStatus: TicketStatus) => {
    setPendingStatus(newStatus);
    setResolutionSummary("");
    setShowStatusModal(true);
  };

  // Operational: Confirm Status Transition
  const handleConfirmStatusTransition = async () => {
    if (!ticket || !pendingStatus) return;
    setOpLoading(true);
    setShowStatusModal(false);
    setOpFeedback(null);
    try {
      await updateTicketStatus(
        ticket.id,
        pendingStatus,
        pendingStatus === "RESOLVED" ? resolutionSummary.trim() || undefined : undefined
      );
      setOpFeedback({
        type: "success",
        message: `Ticket status successfully changed to ${pendingStatus.replace(/_/g, " ")}.`,
      });
      await fetchTicket();
    } catch (err: any) {
      setOpFeedback({ type: "danger", message: err.message || "Failed to update ticket status." });
    } finally {
      setOpLoading(false);
      setPendingStatus(null);
    }
  };

  // Discussions: Submit Public Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentInput.trim()) return;

    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const newComment = await createPublicComment(ticket.id, commentInput.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentInput("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Discussions: Submit Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !noteInput.trim()) return;

    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const newNote = await createInternalNote(ticket.id, noteInput.trim());
      setNotes((prev) => [...prev, newNote]);
      setNoteInput("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to post internal note.");
    } finally {
      setNoteSubmitting(false);
    }
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
    const label = s.replace(/_/g, " ");
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

  if (loading) {
    return (
      <div className="zen-card p-5 text-center" data-testid="staff-ticket-detail-loading">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="text-muted small">Loading ticket details…</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-card p-4" data-testid="staff-ticket-detail-error">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 mb-4"
          onClick={handleBack}
        >
          <span className="material-symbols-outlined fs-6">arrow_back</span>
          Back to Ticket Queue
        </button>
        <div className="alert alert-danger" role="alert">
          {error || "Ticket not found."}
        </div>
      </div>
    );
  }

  const nextStatuses = PERMITTED_NEXT_STATUSES[ticket.currentStatus] || [];
  const isClaimedByMe = authUser && ticket.ticketOwnerId === authUser.id;

  return (
    <div className="zen-staff-ticket-detail" data-testid="staff-ticket-detail">
      <div data-testid="ticket-detail-view">
      {/* Top Navigation & Actions Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={handleBack}
          aria-label="Back to Ticket Queue"
        >
          <span className="material-symbols-outlined fs-6">arrow_back</span>
          Back to Ticket Queue
        </button>

        <div className="d-flex align-items-center gap-2">
          {ticket.problemAppearsResolved && (
            <span className="badge bg-success-subtle text-success border border-success-subtle d-flex align-items-center gap-1">
              <span className="material-symbols-outlined fs-6">check_circle</span>
              Requester Indicated Resolved
            </span>
          )}
          <span className="text-muted small fw-medium">Ticket ID: #{ticket.id}</span>
        </div>
      </div>

      {/* Operation Feedback Banner */}
      {opFeedback && (
        <div
          className={`alert alert-${opFeedback.type} alert-dismissible fade show mb-3 d-flex align-items-center gap-2`}
          role="alert"
        >
          <span className="material-symbols-outlined fs-5">
            {opFeedback.type === "success" ? "check_circle" : "error"}
          </span>
          <div className="small flex-grow-1">{opFeedback.message}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setOpFeedback(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Dual Column Layout: Left Operational Controls / Right Discussions */}
      <div className="row g-4">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Ticket Information, Controls & Attachments           */}
        {/* ================================================================= */}
        <div className="col-12 col-lg-7">
          {/* Main Ticket Card */}
          <div className="zen-card p-4 mb-4">
            {/* Ticket Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3 pb-3 border-bottom">
              <div>
                <span className="badge bg-light text-muted border mb-1">Operational Support Ticket</span>
                <h1 className="h4 fw-bold text-success mb-1">{ticket.ticketNumber}</h1>
                <p className="text-muted small mb-0">Created on {formatDate(ticket.createdAt)}</p>
              </div>
              <div className="text-end">
                <small className="text-muted d-block mb-1">Current Status</small>
                {formatStatusBadge(ticket.currentStatus)}
              </div>
            </div>

            {/* Operational Controls Toolbar */}
            <div className="p-3 bg-light rounded border mb-4">
              <h2 className="h6 fw-bold mb-3 d-flex align-items-center gap-1 text-success">
                <span className="material-symbols-outlined fs-5">tune</span>
                Operational Controls
              </h2>

              <div className="row g-3">
                {/* 1. Ticket Ownership Control */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="ownerSelect" className="form-label small fw-semibold text-muted mb-1">
                    Ticket Owner
                  </label>
                  <div className="d-flex gap-2">
                    <select
                      id="ownerSelect"
                      data-testid="owner-select"
                      className="form-select form-select-sm"
                      value={ticket.ticketOwnerId || ""}
                      onChange={(e) => handleOwnerChange(e.target.value)}
                      disabled={opLoading}
                      aria-label="Ticket Owner"
                    >
                      <option value="" disabled>
                        {ticket.ticketOwnerId ? "Select Owner" : "Unassigned"}
                      </option>
                      {activeStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role === "ADMINISTRATOR" ? "Admin" : "Staff"})
                        </option>
                      ))}
                    </select>

                    {!isClaimedByMe && (
                      <button
                        type="button"
                        data-testid="claim-ticket-btn"
                        className="btn btn-sm btn-zen-primary text-nowrap"
                        onClick={handleClaim}
                        disabled={opLoading}
                        title="Claim this ticket as owner"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                  {isClaimedByMe && (
                    <span className="text-success small d-block mt-1">
                      ✓ Claimed by you
                    </span>
                  )}
                </div>

                {/* 2. IT Priority Selector */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="itPrioritySelect" className="form-label small fw-semibold text-muted mb-1">
                    IT Priority
                  </label>
                  <div className="d-flex align-items-center gap-2">
                    <select
                      id="itPrioritySelect"
                      data-testid="it-priority-select"
                      className="form-select form-select-sm"
                      value={ticket.itPriority}
                      onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                      disabled={opLoading}
                      aria-label="IT Priority"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                    {formatPriorityBadge(ticket.itPriority)}
                  </div>
                  <span className="text-muted small d-block mt-1">
                    Req: {ticket.requestedPriority}
                  </span>
                </div>

                {/* 3. Status Transition Action Selector */}
                <div className="col-12">
                  <label htmlFor="statusTransitionSelect" className="form-label small fw-semibold text-muted mb-1">
                    Advance Status Workflow
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {nextStatuses.length === 0 ? (
                      <span className="text-muted small fst-italic">
                        No further transitions permitted from {ticket.currentStatus.replace(/_/g, " ")}.
                      </span>
                    ) : (
                      nextStatuses.map((targetStatus) => (
                        <button
                          key={targetStatus}
                          type="button"
                          data-testid={`status-transition-${targetStatus}`}
                          className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                          onClick={() => handleSelectStatus(targetStatus)}
                          disabled={opLoading}
                        >
                          <span>Move to {targetStatus.replace(/_/g, " ")}</span>
                          <span className="material-symbols-outlined fs-6">arrow_forward</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Ticket Information Fields */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-semibold text-muted mb-1">Requester</label>
                <input
                  type="text"
                  readOnly
                  className="zen-input zen-input-readonly form-control"
                  value={`${ticket.requester?.name || "Unknown"} (${ticket.requester?.email || ""})`}
                  aria-label="Requester details"
                />
              </div>

              <div className="col-12 col-sm-6">
                <label className="form-label small fw-semibold text-muted mb-1">Category / Related System</label>
                <input
                  type="text"
                  readOnly
                  className="zen-input zen-input-readonly form-control"
                  value={`${ticket.category?.name || "—"} / ${ticket.relatedSystem?.name || "—"}`}
                  aria-label="Category and System"
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-semibold text-muted mb-1">Summary</label>
                <input
                  type="text"
                  readOnly
                  className="zen-input zen-input-readonly form-control fw-semibold"
                  value={ticket.summary}
                  aria-label="Ticket Summary"
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-semibold text-muted mb-1">Description</label>
                <textarea
                  readOnly
                  rows={4}
                  className="zen-input zen-input-readonly form-control"
                  value={ticket.description}
                  aria-label="Ticket Description"
                />
              </div>

              {ticket.resolutionSummary && (
                <div className="col-12">
                  <label className="form-label small fw-semibold text-success mb-1">
                    Resolution Summary
                  </label>
                  <div className="p-2 border border-success-subtle bg-success-subtle rounded small">
                    {ticket.resolutionSummary}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={ticket.requesterId}
            attachments={ticket.attachments || []}
            onAttachmentChanged={fetchTicket}
          />
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Discussions Stream (Public Comments & Notes)        */}
        {/* ================================================================= */}
        <div className="col-12 col-lg-5">
          {/* 1. Public Comments Stream Panel */}
          <div className="zen-card p-3 mb-4 border-success-subtle" data-testid="public-comments-panel">
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <div>
                <h2 className="h6 fw-bold mb-0 text-success d-flex align-items-center gap-1">
                  <span className="material-symbols-outlined fs-5">forum</span>
                  Public Comments
                </h2>
                <small className="text-muted">Visible to Requester and Support Staff</small>
              </div>
              <span className="badge bg-light text-dark border">
                {comments.length}
              </span>
            </div>

            {/* Comments List */}
            <div
              className="comments-thread mb-3"
              style={{ maxHeight: "320px", overflowY: "auto" }}
            >
              {commentsLoading && comments.length === 0 ? (
                <div className="text-center py-3 text-muted small">Loading comments…</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-4 text-muted small fst-italic">
                  No public comments yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {comments.map((c) => (
                    <div key={c.id} className="p-2 bg-light rounded border">
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

            {/* Add Public Comment Form */}
            <form onSubmit={handleAddComment}>
              {commentError && (
                <div className="alert alert-danger p-2 small mb-2">{commentError}</div>
              )}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Type a public message visible to the requester…"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={2000}
                  disabled={commentSubmitting}
                  aria-label="Add Public Comment"
                />
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {commentInput.length}/2000 characters
                  </small>
                </div>
              </div>
              <button
                type="submit"
                data-testid="add-comment-btn"
                className="btn btn-sm btn-zen-primary w-100 d-flex align-items-center justify-content-center gap-1"
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
                    <span>Post Public Comment</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 2. Confidential Internal Notes Panel */}
          <div
            className="zen-card p-3"
            data-testid="internal-notes-panel"
            style={{
              backgroundColor: "var(--color-internal-note-bg, #FFFDF0)",
              borderColor: "var(--color-internal-note-border, #ECC94B)",
              borderWidth: "1.5px",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-warning-subtle">
              <div>
                <div className="d-flex align-items-center gap-1 mb-1">
                  <span className="material-symbols-outlined fs-5 text-warning">lock</span>
                  <h2 className="h6 fw-bold mb-0 text-dark">Internal Notes</h2>
                </div>
                <span className="badge bg-warning-subtle text-dark border border-warning" style={{ fontSize: "0.7rem" }}>
                  Confidential: Visible only to IT Staff & Admin
                </span>
              </div>
              <span className="badge bg-warning-subtle text-dark border border-warning">
                {notes.length}
              </span>
            </div>

            {/* Notes List */}
            <div
              className="notes-thread mb-3"
              style={{ maxHeight: "320px", overflowY: "auto" }}
            >
              {notesLoading && notes.length === 0 ? (
                <div className="text-center py-3 text-muted small">Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted small fst-italic">
                  No internal notes yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 rounded border border-warning-subtle"
                      style={{ backgroundColor: "#FFFDE8" }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold small text-dark">{n.author.name}</span>
                        <div className="d-flex align-items-center gap-1">
                          <span className="badge bg-secondary text-white" style={{ fontSize: "0.7rem" }}>
                            {n.author.role}
                          </span>
                          <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="mb-0 small text-break" style={{ whiteSpace: "pre-wrap" }}>
                        {n.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Internal Note Form */}
            <form onSubmit={handleAddNote}>
              {noteError && <div className="alert alert-danger p-2 small mb-2">{noteError}</div>}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm bg-white"
                  rows={3}
                  placeholder="Record private operational notes, diagnostic data, or escalation details…"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  maxLength={2000}
                  disabled={noteSubmitting}
                  aria-label="Add Internal Note"
                />
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {noteInput.length}/2000 characters
                  </small>
                </div>
              </div>
              <button
                type="submit"
                data-testid="add-note-btn"
                className="btn btn-sm btn-warning w-100 d-flex align-items-center justify-content-center gap-1 fw-semibold text-dark"
                disabled={noteSubmitting || !noteInput.trim()}
              >
                {noteSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Saving Note…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined fs-6">lock</span>
                    <span>Save Internal Note</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Status Transition Confirmation Modal */}
      {showStatusModal && pendingStatus && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card">
              <div className="modal-header border-bottom">
                <h3 className="modal-title h6 fw-bold mb-0">Confirm Status Transition</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="small mb-3">
                  Are you sure you want to transition this ticket from{" "}
                  <strong>{ticket.currentStatus.replace(/_/g, " ")}</strong> to{" "}
                  <strong className="text-success">{pendingStatus.replace(/_/g, " ")}</strong>?
                </p>

                {pendingStatus === "RESOLVED" && (
                  <div className="mb-3">
                    <label htmlFor="resolutionSummary" className="form-label small fw-semibold text-muted mb-1">
                      Resolution Summary (Optional)
                    </label>
                    <textarea
                      id="resolutionSummary"
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Briefly describe the resolution applied…"
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-status-btn"
                  className="btn btn-sm btn-zen-primary"
                  onClick={handleConfirmStatusTransition}
                >
                  Confirm Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

