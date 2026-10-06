import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import { getStaffDashboard, StaffDashboardResponse } from "../api.js";
import OperationalDashboardContent from "./OperationalDashboardContent.js";

export {
  DeltaIndicator,
  formatDate,
  formatPriorityBadge,
  formatStatusBadge,
} from "./OperationalDashboardContent.js";

export function ForbiddenStateView({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="container py-5">
      <div className="zen-card p-5 text-center mx-auto" style={{ maxWidth: 540 }}>
        <span
          className="material-symbols-outlined mb-3"
          style={{ fontSize: "48px", color: "#4A5568" }}
        >
          lock
        </span>
        <h1 className="h4 fw-bold text-dark mb-2">403 - Access Forbidden</h1>
        <p className="text-muted mb-4">
          You do not have the required permissions to view this operational dashboard. Access is restricted to authorized IT Staff and Administrators.
        </p>
        <button type="button" className="btn btn-zen-primary" onClick={onReturn}>
          Return to My Dashboard
        </button>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { setActiveTab, setSelectedTicketId } = useRequester();
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const roleForbidden = user?.role === "REQUESTER";

  const fetchDashboard = useCallback(async () => {
    if (roleForbidden) {
      setIsForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      setData(await getStaffDashboard());
    } catch (err: any) {
      if (err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || "Unable to load IT Staff dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, [roleForbidden]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDrillDown = (url: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", url);
    }
    setActiveTab("ticket-queue");
  };

  const handleTicketClick = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-detail", ticketId);
  };

  if (roleForbidden || isForbidden) {
    return (
      <ForbiddenStateView
        onReturn={() => {
          if (typeof window !== "undefined") {
            window.history.pushState({}, "", "/dashboard");
          }
          setActiveTab("dashboard");
        }}
      />
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Welcome back, {user?.name || "Staff"}!</h1>
          <p className="text-muted mb-0">Here's what's happening with your queue today.</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={fetchDashboard}
          disabled={loading}
          aria-label="Refresh dashboard"
        >
          <span className={`material-symbols-outlined fs-6 ${loading ? "spinning" : ""}`}>
            refresh
          </span>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4" role="alert">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined fs-5">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={fetchDashboard}
          >
            <span className="material-symbols-outlined fs-6">refresh</span>
            Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="row g-3 mb-4 placeholder-glow" aria-label="Loading dashboard">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="col-12 col-md-4 col-lg">
              <div className="zen-card p-3">
                <div className="placeholder col-6 mb-2" style={{ height: "14px" }} />
                <div className="placeholder col-4 mb-2" style={{ height: "32px" }} />
                <div className="placeholder col-8" style={{ height: "12px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <OperationalDashboardContent
          data={data}
          onDrillDown={handleDrillDown}
          onTicketClick={handleTicketClick}
          onViewAll={() => setActiveTab("ticket-queue")}
        />
      )}
    </div>
  );
}
