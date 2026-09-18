import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";
import {
  getStaffTickets,
  getCategories,
  Category,
  Ticket,
  Priority,
  TicketStatus,
} from "../api.js";

export default function StaffTicketQueue() {
  const { setActiveTab, setSelectedTicketId } = useRequester();
  const { user: authUser } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [itPriority, setItPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [ownershipFilter, setOwnershipFilter] = useState<string>(""); // "" (All) | "me" | "unassigned"

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<"createdAt" | "itPriority" | "currentStatus" | "ticketNumber">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load category options on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (_err) {
        // Categories list optional for filter dropdown
      }
    }
    loadCategories();
  }, []);

  // Fetch tickets whenever filters, page, or sort changes
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let resolvedOwnerId: number | "unassigned" | undefined = undefined;
      if (ownershipFilter === "unassigned") {
        resolvedOwnerId = "unassigned";
      } else if (ownershipFilter === "me" && authUser) {
        resolvedOwnerId = authUser.id;
      }

      const res = await getStaffTickets({
        search: search.trim() || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        itPriority: itPriority ? (itPriority as Priority) : undefined,
        status: status ? (status as TicketStatus) : undefined,
        ownerId: resolvedOwnerId,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      setTickets(res.data);
      setPagination({
        page: res.pagination.page,
        pageSize: res.pagination.pageSize,
        total: res.pagination.total ?? 0,
        totalPages: res.pagination.totalPages,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load ticket queue.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, itPriority, status, ownershipFilter, authUser, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasActiveFilters = Boolean(
    search.trim() || categoryId || itPriority || status || ownershipFilter
  );

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setItPriority("");
    setStatus("");
    setOwnershipFilter("");
    setPage(1);
  };

  const handleSort = (field: "createdAt" | "itPriority" | "currentStatus" | "ticketNumber") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleOpenDetail = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-detail", ticketId);
  };

  const formatPriorityBadge = (p: Priority) => {
    const classMap: Record<Priority, string> = {
      LOW: "badge-priority-low",
      MEDIUM: "badge-priority-medium",
      HIGH: "badge-priority-high",
      URGENT: "badge-priority-urgent",
    };
    return <span className={`badge ${classMap[p] || "bg-secondary"}`}>{p}</span>;
  };

  const formatStatusBadge = (s: TicketStatus) => {
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="zen-card p-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h4 fw-bold mb-1">IT Staff Ticket Queue</h1>
          <p className="text-muted small mb-0">
            Manage, triage, and reassign tickets across all requesters.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-light p-3 rounded mb-4 border">
        <div className="row g-2 align-items-center">
          {/* Search Box */}
          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <span className="material-symbols-outlined text-muted fs-5">search</span>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search Ticket No. or summary..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search tickets"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="WAITING_FOR_REQUESTER">WAITING FOR REQUESTER</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="REOPENED">REOPENED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* IT Priority Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={itPriority}
              onChange={(e) => {
                setItPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by IT Priority"
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Ownership Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={ownershipFilter}
              onChange={(e) => {
                setOwnershipFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Ownership"
            >
              <option value="">All Tickets</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="col-12 col-md-1 text-md-end text-center mt-2 mt-md-0">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={handleClearFilters}
                title="Clear all active search and filter constraints"
                aria-label="Clear Filters"
              >
                <span className="material-symbols-outlined fs-6">filter_alt_off</span>
                <span className="d-md-none">Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <span className="material-symbols-outlined fs-5">error</span>
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-auto"
            onClick={fetchTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-success mb-2" role="status" aria-label="Loading tickets">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="small mb-0">Loading ticket queue...</p>
        </div>
      )}

      {/* Empty State: Zero tickets in the entire queue */}
      {!loading && !error && tickets.length === 0 && !hasActiveFilters && (
        <div className="text-center py-5 text-muted">
          <span className="material-symbols-outlined fs-1 text-muted mb-2">inbox</span>
          <h2 className="h5 fw-semibold mb-1">No tickets in queue</h2>
          <p className="small mb-0">There are currently no tickets submitted across the organization.</p>
        </div>
      )}

      {/* No Results State: Active filters match zero tickets */}
      {!loading && !error && tickets.length === 0 && hasActiveFilters && (
        <div className="text-center py-5 text-muted">
          <span className="material-symbols-outlined fs-1 text-muted mb-2">filter_list_off</span>
          <h2 className="h5 fw-semibold mb-1">No tickets match your filter criteria</h2>
          <p className="small mb-3">Try modifying or clearing your search term, status, priority, or ownership filter.</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Tickets Presentation */}
      {!loading && !error && tickets.length > 0 && (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="table-responsive d-none d-md-block mb-3">
            <table className="table table-hover align-middle mb-0 zen-table">
              <thead className="table-light">
                <tr>
                  <th scope="col" onClick={() => handleSort("ticketNumber")} style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center gap-1">
                      Ticket No.
                      {sortBy === "ticketNumber" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" onClick={() => handleSort("createdAt")} style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center gap-1">
                      Created
                      {sortBy === "createdAt" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col">Category</th>
                  <th scope="col">Priority</th>
                  <th scope="col" onClick={() => handleSort("itPriority")} style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center gap-1">
                      IT Priority
                      {sortBy === "itPriority" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" onClick={() => handleSort("currentStatus")} style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center gap-1">
                      Status
                      {sortBy === "currentStatus" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleOpenDetail(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenDetail(t.id);
                      }
                    }}
                  >
                    <td className="fw-semibold text-success">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold text-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(t.id);
                        }}
                      >
                        {t.ticketNumber}
                      </button>
                    </td>
                    <td className="text-muted small">{formatDate(t.createdAt)}</td>
                    <td className="fw-medium text-truncate" style={{ maxWidth: 260 }} title={t.summary}>
                      {t.summary}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {t.category?.name || "General"}
                      </span>
                    </td>
                    <td>{formatPriorityBadge(t.requestedPriority)}</td>
                    <td>{formatPriorityBadge(t.itPriority)}</td>
                    <td>{formatStatusBadge(t.currentStatus)}</td>
                    <td>
                      {t.ticketOwner ? (
                        <span className="badge bg-light text-dark border">
                          {t.ticketOwner.name}
                        </span>
                      ) : (
                        <span className="text-muted small fst-italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="zen-ticket-card"
                onClick={() => handleOpenDetail(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenDetail(t.id);
                  }
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="fw-bold text-success">{t.ticketNumber}</span>
                  {formatStatusBadge(t.currentStatus)}
                </div>
                <h2 className="h6 fw-semibold mb-2">{t.summary}</h2>
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className="badge bg-light text-dark border small">
                    {t.category?.name || "General"}
                  </span>
                  {formatPriorityBadge(t.itPriority)}
                  <span className="badge bg-light text-muted border small">
                    {t.ticketOwner ? t.ticketOwner.name : "Unassigned"}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center text-muted small pt-1 border-top">
                  <span>{formatDate(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
            <div className="text-muted small">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total tickets)
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                aria-label="Previous page"
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
