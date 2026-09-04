import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { getTickets, getCategories, Category, Ticket, Priority, TicketStatus } from "../api.js";

export default function MyTicketsList() {
  const { requester, setActiveTab } = useRequester();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");

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
  const [sortBy, setSortBy] = useState<string>("createdAt");
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

  // Fetch tickets whenever requester, filters, page, or sort changes
  const fetchTickets = useCallback(async () => {
    if (!requester) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getTickets({
        requesterId: requester.id,
        search: search.trim() || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        priority: priority ? (priority as Priority) : undefined,
        status: status ? (status as TicketStatus) : undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [requester, search, categoryId, priority, status, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasActiveFilters = Boolean(search.trim() || categoryId || priority || status);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setPriority("");
    setStatus("");
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
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

  if (!requester) {
    return null;
  }

  return (
    <div className="zen-card p-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h4 fw-bold mb-1">My Tickets</h1>
          <p className="text-muted small mb-0">
            Viewing support requests for{" "}
            <strong className="text-dark">{requester?.name ?? "Guest"}</strong>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-zen-primary d-flex align-items-center gap-1"
          onClick={() => setActiveTab("create-ticket")}
        >
          <span className="material-symbols-outlined fs-5">add_circle</span>
          New Ticket
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-light p-3 rounded mb-4 border">
        <div className="row g-2 align-items-center">
          {/* Search Box */}
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <span className="material-symbols-outlined text-muted fs-5">search</span>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by ticket number or summary..."
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

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Priority"
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
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
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="PENDING">PENDING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="col-6 col-md-2 text-end">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={handleClearFilters}
              >
                <span className="material-symbols-outlined fs-6">filter_alt_off</span>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <span className="material-symbols-outlined fs-5">error</span>
          <div>{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-auto"
            onClick={fetchTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success mb-2" role="status" />
          <div className="text-muted small">Loading tickets…</div>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty / No-Results States */
        hasActiveFilters ? (
          <div className="text-center py-5">
            <span className="material-symbols-outlined fs-1 text-muted mb-2">search_off</span>
            <h2 className="h5 fw-bold text-muted mb-1">No matching tickets found</h2>
            <p className="text-muted small mb-3">
              No tickets matched your current search and filter criteria.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-zen-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="text-center py-5">
            <span className="material-symbols-outlined fs-1 text-success mb-2">confirmation_number</span>
            <h2 className="h5 fw-bold text-success mb-1">You haven't submitted any tickets yet</h2>
            <p className="text-muted small mb-3">
              Need technical assistance? Submit a request and our IT support desk will resolve it.
            </p>
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={() => setActiveTab("create-ticket")}
            >
              Create Ticket
            </button>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="table-responsive d-none d-md-block mb-3">
            <table className="table table-hover zen-table align-middle">
              <thead className="table-light">
                <tr>
                  <th scope="col" onClick={() => handleSort("ticketNumber")}>
                    <div className="d-flex align-items-center gap-1">
                      Ticket No.
                      {sortBy === "ticketNumber" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" onClick={() => handleSort("createdAt")}>
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
                  <th scope="col" onClick={() => handleSort("requestedPriority")}>
                    <div className="d-flex align-items-center gap-1">
                      Priority
                      {sortBy === "requestedPriority" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col">IT Priority</th>
                  <th scope="col" onClick={() => handleSort("currentStatus")}>
                    <div className="d-flex align-items-center gap-1">
                      Status
                      {sortBy === "currentStatus" && (
                        <span className="material-symbols-outlined fs-6">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="text-center">Files</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold text-success">{t.ticketNumber}</td>
                    <td className="text-muted small">{formatDate(t.createdAt)}</td>
                    <td className="fw-medium text-truncate" style={{ maxWidth: 280 }} title={t.summary}>
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
                    <td className="text-center">
                      {(t.attachmentCount ?? 0) > 0 ? (
                        <span className="badge bg-light text-muted border d-inline-flex align-items-center gap-1">
                          <span className="material-symbols-outlined fs-6">attach_file</span>
                          {t.attachmentCount}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< 768px) */}
          <div className="d-flex flex-column gap-3 d-md-none mb-4">
            {tickets.map((t) => (
              <div key={t.id} className="zen-ticket-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="fw-bold text-success">{t.ticketNumber}</span>
                  {formatStatusBadge(t.currentStatus)}
                </div>
                <h2 className="h6 fw-semibold mb-2">{t.summary}</h2>
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className="badge bg-light text-dark border small">
                    {t.category?.name || "General"}
                  </span>
                  {formatPriorityBadge(t.requestedPriority)}
                  {(t.attachmentCount ?? 0) > 0 && (
                    <span className="badge bg-light text-muted border small d-flex align-items-center gap-1">
                      <span className="material-symbols-outlined fs-6">attach_file</span>
                      {t.attachmentCount}
                    </span>
                  )}
                </div>
                <div className="text-muted small">{formatDate(t.createdAt)}</div>
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
