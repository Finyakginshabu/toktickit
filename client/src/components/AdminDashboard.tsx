import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import { AdminDashboardResponse, getAdminDashboard, StaffDashboardResponse } from "../api.js";
import OperationalDashboardContent from "./OperationalDashboardContent.js";
import { ForbiddenStateView } from "./StaffDashboard.js";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { setActiveTab, setSelectedTicketId } = useRequester();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const roleForbidden = user?.role !== "ADMINISTRATOR";

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
      setData(await getAdminDashboard());
    } catch (err: any) {
      if (err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || "Unable to load Administrator dashboard.");
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
          const destination = user?.role === "IT_STAFF" ? "/staff/dashboard" : "/dashboard";
          if (typeof window !== "undefined") {
            window.history.pushState({}, "", destination);
          }
          setActiveTab("dashboard");
        }}
      />
    );
  }

  const metrics = data?.ticketMetrics || data?.metrics;
  const operationalData: StaffDashboardResponse | null =
    data && metrics ? { ...data, metrics } : null;

  return (
    <div className="container zen-dashboard-container py-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">
            Welcome back, {user?.name || "Administrator"}!
          </h1>
          <p className="text-muted mb-0">
            System-wide operational queues and user directory overview.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          style={{ minHeight: "40px" }}
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

      {data && metrics && operationalData && (
        <>
          <div className="zen-card p-4 mb-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
              <div>
                <h2 className="h5 fw-bold mb-1">Administrator System Overview</h2>
                <p className="text-muted small mb-0">
                  Registered accounts across organizational roles
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-zen-primary d-inline-flex align-items-center gap-1"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.pushState({}, "", "/admin/users");
                  }
                  setActiveTab("user-management");
                }}
              >
                <span>Manage Users</span>
                <span className="material-symbols-outlined fs-6">arrow_forward</span>
              </button>
            </div>

            <div className="row g-3 text-center align-items-stretch">
              <div className="col-6 col-md-3">
                <div className="admin-overview-tile p-3 bg-light rounded border">
                  <span className="text-muted small text-uppercase fw-semibold">Total Users</span>
                  <div className="fs-3 fw-bold text-dark mt-1">{data.userMetrics.totalUsers}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="admin-overview-tile p-3 bg-light rounded border">
                  <span className="text-muted small text-uppercase fw-semibold">Active Users</span>
                  <div className="fs-3 fw-bold text-success mt-1">{data.userMetrics.activeUsers}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="admin-overview-tile p-3 bg-light rounded border">
                  <span className="text-muted small text-uppercase fw-semibold">Inactive Users</span>
                  <div className="fs-3 fw-bold text-secondary mt-1">{data.userMetrics.inactiveUsers}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="admin-overview-tile p-3 bg-light rounded border text-start">
                  <h3 className="text-muted small text-uppercase fw-semibold mb-2">By Role</h3>
                  {[
                    { label: "Requesters", count: data.userMetrics.usersByRole.REQUESTER },
                    { label: "IT Staff", count: data.userMetrics.usersByRole.IT_STAFF },
                    { label: "Admins", count: data.userMetrics.usersByRole.ADMINISTRATOR },
                  ].map((role) => (
                    <div
                      className="d-flex align-items-center justify-content-between gap-2 small"
                      key={role.label}
                    >
                      <span className="text-muted">{role.label}</span>
                      <span className="fw-semibold text-dark">{role.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <OperationalDashboardContent
            data={operationalData}
            onDrillDown={handleDrillDown}
            onTicketClick={handleTicketClick}
            onViewAll={() => setActiveTab("ticket-queue")}
          />
        </>
      )}
    </div>
  );
}
