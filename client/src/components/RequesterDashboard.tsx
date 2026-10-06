import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import { getRequesterDashboard, RequesterDashboardResponse } from "../api.js";
import RecentTicketCards, { formatDate, formatStatusBadge } from "./RecentTicketCards.js";

export { formatDate, formatStatusBadge };

export default function RequesterDashboard() {
  const { user } = useAuth();
  const { setActiveTab, setSelectedTicketId } = useRequester();

  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRequesterDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Unable to load requester dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDrillDown = (url: string) => {
    // Push url into browser history and set activeTab
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", url);
    }
    setActiveTab("my-tickets");
  };

  const handleTicketClick = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-detail", ticketId);
  };

  return (
    <div className="container zen-dashboard-container py-4">
      {/* Header Greeting Banner */}
      <div className="mb-4">
        <h1 className="h3 fw-bold text-dark mb-1">Welcome, {user?.name || "Requester"}!</h1>
        <p className="text-muted mb-0">Here's the latest on your requests.</p>
      </div>

      {/* Safe Failure Banner */}
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

      {/* Loading Skeleton View */}
      {loading && !data && (
        <div>
          {/* Metric Cards Skeleton (Desktop: 4 in row; Tablet: 2 in row; Mobile: 1 stacked) */}
          <div className="row g-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="col-12 col-md-6 col-lg-3">
                <div className="zen-card p-4 placeholder-glow">
                  <div className="placeholder col-6 mb-2" style={{ height: "16px" }}></div>
                  <div className="placeholder col-4" style={{ height: "36px" }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* 2:1 Split Skeleton */}
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="zen-card p-4 placeholder-glow">
                <div className="placeholder col-5 mb-3" style={{ height: "20px" }}></div>
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="d-flex gap-3 mb-2">
                    <span className="placeholder col-3" style={{ height: "20px" }}></span>
                    <span className="placeholder col-5" style={{ height: "20px" }}></span>
                    <span className="placeholder col-2" style={{ height: "20px" }}></span>
                    <span className="placeholder col-2" style={{ height: "20px" }}></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="zen-card p-4 placeholder-glow">
                <div className="placeholder col-6 mb-3" style={{ height: "20px" }}></div>
                <div className="placeholder col-12 mb-2" style={{ height: "38px" }}></div>
                <div className="placeholder col-12" style={{ height: "38px" }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Populated / Empty View */}
      {data && (
        <>
          {/* Attention Banner if tickets are waiting for requester response */}
          {data.metrics.waitingForRequesterTickets > 0 && (
            <div
              className="alert mb-4 d-flex align-items-center justify-content-between"
              style={{
                backgroundColor: "var(--color-warning-bg, #FEFCBF)",
                color: "var(--color-warning, #975A16)",
                border: "1px solid #ECC94B",
              }}
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <span className="material-symbols-outlined fs-5">warning</span>
                <span className="fw-medium">
                  You have {data.metrics.waitingForRequesterTickets} ticket(s) waiting for your response.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark fw-semibold"
                onClick={() => handleDrillDown(data.drillDownUrls.waitingForRequesterTickets)}
              >
                View Waiting Tickets →
              </button>
            </div>
          )}

          {/* 4 Metric Cards Grid (Desktop: 4 in row >=992px; Tablet: 2 in row; Mobile: 1 stacked <768px) */}
          <div className="row g-3 mb-4">
            {/* 1. My Open Tickets */}
            <div className="col-12 col-md-6 col-lg-3">
              <div
                className="zen-card p-3 h-100 d-flex flex-column justify-content-between"
                role="button"
                tabIndex={0}
                onClick={() => handleDrillDown(data.drillDownUrls.myOpenTickets)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDrillDown(data.drillDownUrls.myOpenTickets);
                  }
                }}
                aria-label={`My Open tickets: ${data.metrics.myOpenTickets}. Click to view list`}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold tracking-wide">My Open</span>
                  <div className="fs-2 fw-bold text-dark mt-1">{data.metrics.myOpenTickets}</div>
                </div>
                <div className="mt-2 text-end">
                  <span className="text-success small fw-medium">View all →</span>
                </div>
              </div>
            </div>

            {/* 2. In Progress */}
            <div className="col-12 col-md-6 col-lg-3">
              <div
                className="zen-card p-3 h-100 d-flex flex-column justify-content-between"
                role="button"
                tabIndex={0}
                onClick={() => handleDrillDown(data.drillDownUrls.inProgressTickets)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDrillDown(data.drillDownUrls.inProgressTickets);
                  }
                }}
                aria-label={`In Progress tickets: ${data.metrics.inProgressTickets}. Click to view list`}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold tracking-wide">In Progress</span>
                  <div className="fs-2 fw-bold text-dark mt-1">{data.metrics.inProgressTickets}</div>
                </div>
                <div className="mt-2 text-end">
                  <span className="text-success small fw-medium">View all →</span>
                </div>
              </div>
            </div>

            {/* 3. Resolved */}
            <div className="col-12 col-md-6 col-lg-3">
              <div
                className="zen-card p-3 h-100 d-flex flex-column justify-content-between"
                role="button"
                tabIndex={0}
                onClick={() => handleDrillDown(data.drillDownUrls.resolvedTickets)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDrillDown(data.drillDownUrls.resolvedTickets);
                  }
                }}
                aria-label={`Resolved tickets: ${data.metrics.resolvedTickets}. Click to view list`}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold tracking-wide">Resolved</span>
                  <div className="fs-2 fw-bold text-dark mt-1">{data.metrics.resolvedTickets}</div>
                </div>
                <div className="mt-2 text-end">
                  <span className="text-success small fw-medium">View all →</span>
                </div>
              </div>
            </div>

            {/* 4. Closed */}
            <div className="col-12 col-md-6 col-lg-3">
              <div
                className="zen-card p-3 h-100 d-flex flex-column justify-content-between"
                role="button"
                tabIndex={0}
                onClick={() => handleDrillDown(data.drillDownUrls.closedTickets)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDrillDown(data.drillDownUrls.closedTickets);
                  }
                }}
                aria-label={`Closed tickets: ${data.metrics.closedTickets}. Click to view list`}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold tracking-wide">Closed</span>
                  <div className="fs-2 fw-bold text-dark mt-1">{data.metrics.closedTickets}</div>
                </div>
                <div className="mt-2 text-end">
                  <span className="text-success small fw-medium">View all →</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2:1 Main Content Split */}
          <div className="row g-4">
            {/* Left Column: My Recent Ticket Cards */}
            <div className="col-12 col-lg-8">
              <div className="zen-card p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h5 fw-bold mb-0">My Recent Tickets</h2>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-success text-decoration-none fw-semibold small"
                    onClick={() => setActiveTab("my-tickets")}
                  >
                    View all requests →
                  </button>
                </div>

                {data.recentTickets.length === 0 ? (
                  <div className="text-center py-5">
                    <span className="material-symbols-outlined text-muted fs-1 mb-2">assignment_late</span>
                    <p className="text-muted mb-3">You have not submitted any tickets yet.</p>
                    <button
                      type="button"
                      className="btn btn-zen-primary"
                      onClick={() => setActiveTab("create-ticket")}
                    >
                      Submit Your First Ticket
                    </button>
                  </div>
                ) : (
                  <RecentTicketCards
                    tickets={data.recentTickets}
                    onTicketClick={handleTicketClick}
                  />
                )}
              </div>
            </div>

            {/* Right Column: Quick Actions */}
            <div className="col-12 col-lg-4">
              <div className="zen-card p-4">
                <h2 className="h5 fw-bold mb-3">Quick Actions</h2>
                <div className="d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-zen-primary d-flex align-items-center justify-content-center gap-2 py-2"
                    style={{ minHeight: "44px" }}
                    onClick={() => setActiveTab("create-ticket")}
                  >
                    <span className="material-symbols-outlined fs-5">add_circle</span>
                    Create Ticket
                  </button>
                  <button
                    type="button"
                    className="btn btn-zen-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                    style={{ minHeight: "44px" }}
                    onClick={() => setActiveTab("my-tickets")}
                  >
                    <span className="material-symbols-outlined fs-5">assignment</span>
                    View My Tickets
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
