import React from "react";
import { StaffDashboardResponse } from "../api.js";
import RecentTicketCards from "./RecentTicketCards.js";
export { formatPriorityBadge, formatStatusBadge, formatDate } from "./RecentTicketCards.js";

export function DeltaIndicator({ delta }: { delta?: number }) {
  const val = delta ?? 0;
  if (val > 0) {
    return (
      <span
        className="d-inline-flex align-items-center gap-1 small fw-medium"
        style={{ color: "#22543D", fontSize: "0.8125rem" }}
      >
        <span>▲</span>
        <span>+{val} from yesterday</span>
      </span>
    );
  }
  if (val < 0) {
    return (
      <span
        className="d-inline-flex align-items-center gap-1 small fw-medium"
        style={{ color: "#2B6CB0", fontSize: "0.8125rem" }}
      >
        <span>▼</span>
        <span>{val} from yesterday</span>
      </span>
    );
  }
  return (
    <span
      className="d-inline-flex align-items-center gap-1 small"
      style={{ color: "#5C6F64", fontSize: "0.8125rem" }}
    >
      <span>0 from yesterday</span>
    </span>
  );
}

interface OperationalDashboardContentProps {
  data: StaffDashboardResponse;
  onDrillDown: (url: string) => void;
  onTicketClick: (ticketId: number) => void;
  onViewAll: () => void;
}

export default function OperationalDashboardContent({
  data,
  onDrillDown,
  onTicketClick,
  onViewAll,
}: OperationalDashboardContentProps) {
  const metricCards = [
    {
      label: "New",
      value: data.metrics.newTickets,
      delta: data.deltas.newTickets,
      url: data.drillDownUrls.newTickets,
    },
    {
      label: "Open",
      value: data.metrics.openTickets,
      delta: data.deltas.openTickets,
      url: data.drillDownUrls.openTickets,
    },
    {
      label: "In Progress",
      value: data.metrics.inProgressTickets,
      delta: data.deltas.inProgressTickets,
      url: data.drillDownUrls.inProgressTickets,
    },
    {
      label: "Waiting",
      value: data.metrics.waitingForRequesterTickets,
      delta: data.deltas.waitingForRequesterTickets,
      url: data.drillDownUrls.waitingForRequesterTickets,
    },
    {
      label: "My Assigned",
      value: data.metrics.myAssignedTickets,
      delta: data.deltas.myAssignedTickets,
      url: data.drillDownUrls.myAssignedTickets,
    },
  ];
  const allZero = metricCards.every(({ value }) => value === 0);

  const handleCardKeyDown = (event: React.KeyboardEvent, url: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDrillDown(url);
    }
  };

  return (
    <>
      {allZero && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="status">
          <span className="material-symbols-outlined fs-5">check_circle</span>
          <span className="fw-medium">All caught up! No open tickets in this queue.</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        {metricCards.map(({ label, value, delta, url }) => (
          <div key={label} className="col-12 col-md-4 col-lg">
            <div
              className="zen-card p-3 h-100 d-flex flex-column justify-content-between"
              role="button"
              tabIndex={0}
              onClick={() => onDrillDown(url)}
              onKeyDown={(event) => handleCardKeyDown(event, url)}
              aria-label={`${label} tickets: ${value}, ${delta >= 0 ? "+" : ""}${delta} from yesterday. Click to view list`}
              style={{ cursor: "pointer" }}
            >
              <div>
                <span className="text-muted small text-uppercase fw-semibold tracking-wide">{label}</span>
                <div className="fs-3 fw-bold text-dark mt-1">{value}</div>
              </div>
              <div className="mt-2">
                <DeltaIndicator delta={delta} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="zen-card p-3 mb-4">
        <div className="d-flex flex-wrap align-items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onDrillDown(data.drillDownUrls.unassignedTickets)}
            onKeyDown={(event) => handleCardKeyDown(event, data.drillDownUrls.unassignedTickets)}
            className="d-inline-flex align-items-center gap-2"
            style={{ cursor: "pointer" }}
            aria-label={`Unassigned tickets: ${data.metrics.unassignedTickets}. Click to view queue`}
          >
            <span className="material-symbols-outlined text-warning fs-5">warning</span>
            <span className="small text-muted">Unassigned:</span>
            <span className="fw-bold fs-6 text-dark">{data.metrics.unassignedTickets}</span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onDrillDown(data.drillDownUrls.highUrgentTickets)}
            onKeyDown={(event) => handleCardKeyDown(event, data.drillDownUrls.highUrgentTickets)}
            className="d-inline-flex align-items-center gap-2"
            style={{ cursor: "pointer" }}
            aria-label={`High or Urgent priority tickets: ${data.metrics.highUrgentTickets}. Click to view queue`}
          >
            <span className="material-symbols-outlined text-danger fs-5">error</span>
            <span className="small text-muted">High / Urgent:</span>
            <span className="fw-bold fs-6 text-danger">{data.metrics.highUrgentTickets}</span>
          </div>

          {data.metrics.myOpenActionsCount !== undefined && (
            <div className="d-inline-flex align-items-center gap-2">
              <span className="material-symbols-outlined text-success fs-5">task_alt</span>
              <span className="small text-muted">My Open Actions:</span>
              <span className="badge bg-light text-dark border fw-bold">
                {data.metrics.myOpenActionsCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="zen-card p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="h5 fw-bold mb-0">Recent Tickets</h2>
              <button
                type="button"
                className="btn btn-link p-0 text-success text-decoration-none fw-semibold small"
                onClick={onViewAll}
              >
                View all →
              </button>
            </div>

            {data.recentTickets.length === 0 ? (
              <div className="text-center py-5">
                <span className="material-symbols-outlined text-muted fs-1 mb-2">inbox</span>
                <p className="text-muted mb-0">No recent tickets in queue.</p>
              </div>
            ) : (
              <RecentTicketCards
                tickets={data.recentTickets}
                onTicketClick={onTicketClick}
                showPriority
              />
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="zen-card p-4">
            <h2 className="h5 fw-bold mb-3">Quick Actions</h2>
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-zen-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={onViewAll}
              >
                <span className="material-symbols-outlined fs-5">search</span>
                Search Tickets
              </button>
              <button
                type="button"
                className="btn btn-zen-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={() => onDrillDown("/staff/queue?ownerId=me")}
              >
                <span className="material-symbols-outlined fs-5">person</span>
                My Queue
              </button>
              <button
                type="button"
                className="btn btn-zen-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={() => onDrillDown("/staff/queue?ownerId=unassigned")}
              >
                <span className="material-symbols-outlined fs-5">inbox</span>
                Unassigned Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
