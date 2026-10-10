import React from "react";
import { Priority, RecentTicketSummary, TicketStatus } from "../api.js";

export function formatPriorityBadge(priority?: Priority | string) {
  if (!priority) return null;
  const classMap: Record<string, string> = {
    LOW: "badge-priority-low",
    MEDIUM: "badge-priority-medium",
    HIGH: "badge-priority-high",
    URGENT: "badge-priority-urgent",
  };
  return <span className={`badge ${classMap[priority] || "bg-secondary"}`}>{priority}</span>;
}

export function formatStatusBadge(status: TicketStatus | string) {
  const classMap: Record<string, string> = {
    NEW: "badge-status-new",
    OPEN: "badge-status-open",
    IN_PROGRESS: "badge-status-in-progress",
    WAITING_FOR_REQUESTER: "badge-status-waiting",
    RESOLVED: "badge-status-resolved",
    CLOSED: "badge-status-closed",
    REOPENED: "badge-status-reopened",
    CANCELLED: "badge-status-cancelled",
  };
  return <span className={`badge ${classMap[status] || "bg-secondary"}`}>{status.replace(/_/g, " ")}</span>;
}

export function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface RecentTicketCardsProps {
  tickets: RecentTicketSummary[];
  onTicketClick: (ticketId: number) => void;
  showPriority?: boolean;
}

export default function RecentTicketCards({
  tickets,
  onTicketClick,
  showPriority = false,
}: RecentTicketCardsProps) {
  return (
    <div className="recent-ticket-cards">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          className="recent-ticket-card"
          onClick={() => onTicketClick(ticket.id)}
          aria-label={`${ticket.ticketNumber}: ${ticket.summary}. ${ticket.currentStatus.replace(/_/g, " ")}${showPriority && ticket.itPriority ? `, ${ticket.itPriority} priority` : ""}. Last updated ${formatDate(ticket.updatedAt)}.`}
        >
          <span className="recent-ticket-card-heading">
            <span className="recent-ticket-number">{ticket.ticketNumber}</span>
            <span className="recent-ticket-badges">
              {formatStatusBadge(ticket.currentStatus)}
              {showPriority && formatPriorityBadge(ticket.itPriority)}
            </span>
          </span>
          <span className="recent-ticket-summary" title={ticket.summary}>
            {ticket.summary}
          </span>
          <span className="recent-ticket-card-footer">
            <span className="text-muted small">Updated {formatDate(ticket.updatedAt)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
