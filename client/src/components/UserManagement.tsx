import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { RoleBadge } from "./AppHeader.js";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  User,
  Role,
} from "../api.js";

export function StatusBadge({ isActive }: { isActive?: boolean }) {
  if (isActive !== false) {
    return <span className="badge badge-role-active">Active</span>;
  }
  return <span className="badge badge-role-inactive">Inactive</span>;
}

export default function UserManagement() {
  const { user: authUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  // Form states - Create User
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createRole, setCreateRole] = useState<Role>("REQUESTER");
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createDepartment, setCreateDepartment] = useState<string>("");
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

  // Form states - Edit User
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRole, setEditRole] = useState<Role>("REQUESTER");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editDepartment, setEditDepartment] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  // Form states - Reset Password
  const [resetPassword, setResetPassword] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply client-side status filter
  const displayedUsers = users.filter((u) => {
    if (statusFilter === "active") return u.isActive !== false;
    if (statusFilter === "inactive") return u.isActive === false;
    return true;
  });

  const hasActiveFilters = Boolean(search.trim() || roleFilter || statusFilter !== "all");

  const handleClearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("all");
  };

  // Count active administrators to enforce last admin rule in UI
  const activeAdminCount = users.filter(
    (u) => u.role === "ADMINISTRATOR" && u.isActive !== false
  ).length;

  // Clear success notification after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle open Edit modal
  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setEditRole(targetUser.role);
    setEditIsActive(targetUser.isActive !== false);
    setEditDepartment(targetUser.department || "");
    setEditError(null);
  };

  // Handle open Reset Password modal
  const handleOpenResetPassword = (targetUser: User) => {
    setResettingPasswordUser(targetUser);
    setResetPassword("");
    setShowResetPassword(false);
    setResetError(null);
  };

  // Handle submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);

    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createPassword,
        department: createDepartment.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("REQUESTER");
      setCreateIsActive(true);
      setCreatePassword("");
      setCreateDepartment("");
      setSuccessMessage("User created successfully with temporary initial password.");
      await fetchUsers();
    } catch (err: any) {
      const message =
        err?.message ||
        (err?.details && err.details.map((d: any) => d.message).join(", ")) ||
        "Failed to create user.";
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditSubmitting(true);

    try {
      await updateAdminUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        isActive: editIsActive,
        department: editDepartment.trim() || undefined,
      });

      setEditingUser(null);
      setSuccessMessage(`User "${editName}" updated successfully.`);
      await fetchUsers();
    } catch (err: any) {
      const message =
        err?.message ||
        (err?.details && err.details.map((d: any) => d.message).join(", ")) ||
        "Failed to update user.";
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordUser) return;

    setResetError(null);
    setResetSubmitting(true);

    try {
      await resetAdminUserPassword(resettingPasswordUser.id, resetPassword);

      setResettingPasswordUser(null);
      setResetPassword("");
      setSuccessMessage(
        `Initial password reset successfully for ${resettingPasswordUser.name}. User must change password at next login.`
      );
      await fetchUsers();
    } catch (err: any) {
      const message =
        err?.message ||
        (err?.details && err.details.map((d: any) => d.message).join(", ")) ||
        "Failed to reset password.";
      setResetError(message);
    } finally {
      setResetSubmitting(false);
    }
  };

  // Check safety constraints for Edit Modal
  const isEditingSelf = editingUser ? authUser?.id === editingUser.id : false;
  const isTargetActiveAdmin = editingUser
    ? editingUser.role === "ADMINISTRATOR" && editingUser.isActive !== false
    : false;
  const isLastActiveAdmin = isTargetActiveAdmin && activeAdminCount <= 1;

  return (
    <div className="zen-card p-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h4 fw-bold mb-1">User Management</h1>
          <p className="text-muted small mb-0">
            Manage user accounts, roles, and initial password resets.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-zen-primary d-flex align-items-center gap-1"
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateError(null);
          }}
          data-testid="create-user-btn"
        >
          <span className="material-symbols-outlined fs-5">person_add</span>
          Create User
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 py-2 px-3"
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-success">check_circle</span>
            <span className="small">{successMessage}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-sm"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 py-2 px-3"
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-danger">error</span>
            <span className="small">{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchUsers}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar (aligned to Staff Ticket Queue design) */}
      <div className="bg-light p-3 rounded mb-4 border">
        <div className="row g-2 align-items-center">
          {/* Keyword Search */}
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <span className="material-symbols-outlined fs-5">search</span>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search users by name or email"
                data-testid="user-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined fs-6">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Role Filter */}
          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "")}
              aria-label="Filter users by role"
              data-testid="role-filter-select"
            >
              <option value="">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              aria-label="Filter users by status"
              data-testid="status-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="col-12 col-md-2 text-md-end text-center mt-2 mt-md-0">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={handleClearFilters}
                title="Clear all active search and filter constraints"
                aria-label="Clear Filters"
              >
                <span className="material-symbols-outlined fs-6">filter_alt_off</span>
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-success mb-2" role="status" aria-label="Loading users">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="small mb-0">Loading user accounts...</p>
        </div>
      )}

      {/* Empty State: Zero users in the entire system */}
      {!loading && !error && users.length === 0 && !hasActiveFilters && (
        <div className="text-center py-5 text-muted">
          <span className="material-symbols-outlined fs-1 text-muted mb-2">inbox</span>
          <h2 className="h5 fw-semibold mb-1">No user accounts found</h2>
          <p className="small mb-0">There are currently no user accounts in the database.</p>
        </div>
      )}

      {/* No Results State: Active filters match zero users */}
      {!loading && !error && displayedUsers.length === 0 && hasActiveFilters && (
        <div className="text-center py-5 text-muted">
          <span className="material-symbols-outlined fs-1 text-muted mb-2">filter_list_off</span>
          <h2 className="h5 fw-semibold mb-1">No users match your filter criteria</h2>
          <p className="small mb-3">Try modifying or clearing your search term, role, or status filter.</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Users Data Table */}
      {!loading && !error && displayedUsers.length > 0 && (
        <>
          <div className="table-responsive mb-3">
            <table className="table table-hover align-middle mb-0 zen-table" data-testid="user-management-table">
              <thead className="table-light">
                <tr>
                  <th scope="col">Full Name</th>
                  <th scope="col">Email Address</th>
                  <th scope="col">Department</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const isCurrent = authUser?.id === u.id;
                  return (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td>
                        <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                          {u.name}
                          {isCurrent && (
                            <span
                              className="badge bg-secondary text-white"
                              style={{ fontSize: "10px" }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted small">{u.email}</td>
                      <td className="text-muted small">
                        {u.department || <span className="fst-italic">—</span>}
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        <StatusBadge isActive={u.isActive !== false} />
                        {u.mustChangePassword && (
                          <span
                            className="badge bg-warning text-dark ms-1"
                            title="User must change password at next login"
                            style={{ fontSize: "10px" }}
                          >
                            Password Reset
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                            onClick={() => handleOpenEdit(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                            title="Edit user details"
                          >
                            <span className="material-symbols-outlined fs-6">edit</span>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center gap-1"
                            onClick={() => handleOpenResetPassword(u)}
                            data-testid={`reset-pwd-btn-${u.id}`}
                            title="Reset initial password"
                          >
                            <span className="material-symbols-outlined fs-6">key</span>
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top text-muted small">
            <div>
              Showing {displayedUsers.length} of {users.length} user{users.length === 1 ? "" : "s"}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal 1: Create User Modal                                        */}
      {/* ------------------------------------------------------------------ */}
      {isCreateModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card shadow">
              <div className="modal-header border-bottom py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-success fs-4">person_add</span>
                  <h2 className="modal-title h5 mb-0 fw-semibold">Create New User</h2>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createSubmitting}
                  aria-label="Close"
                ></button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jane Doe"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                      data-testid="create-name-input"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. jane.doe@toktickit.local"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                      data-testid="create-email-input"
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Role *</label>
                      <select
                        className="form-select"
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value as Role)}
                        required
                        data-testid="create-role-select"
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    </div>

                    <div className="col-4 d-flex flex-column justify-content-end">
                      <div className="form-check form-switch mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="createIsActiveSwitch"
                          checked={createIsActive}
                          onChange={(e) => setCreateIsActive(e.target.checked)}
                          data-testid="create-active-switch"
                        />
                        <label className="form-check-label small" htmlFor="createIsActiveSwitch">
                          Active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Computer Engineering"
                      value={createDepartment}
                      onChange={(e) => setCreateDepartment(e.target.value)}
                      data-testid="create-department-input"
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Initial Password *</label>
                    <div className="input-group">
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        className="form-control"
                        placeholder="At least 8 chars with uppercase, lowercase, number/symbol"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        required
                        data-testid="create-password-input"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        aria-label={showCreatePassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined fs-6">
                          {showCreatePassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <div className="form-text small" style={{ fontSize: "11px" }}>
                      User will be required to change this password upon their first login.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-zen-primary"
                    disabled={createSubmitting}
                    data-testid="create-user-submit"
                  >
                    {createSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal 2: Edit User Modal                                          */}
      {/* ------------------------------------------------------------------ */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card shadow">
              <div className="modal-header border-bottom py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-success fs-4">manage_accounts</span>
                  <h2 className="modal-title h5 mb-0 fw-semibold">Edit User Details</h2>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingUser(null)}
                  disabled={editSubmitting}
                  aria-label="Close"
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4">
                  {editError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                      {editError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      data-testid="edit-name-input"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      data-testid="edit-email-input"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
                      disabled={isLastActiveAdmin}
                      data-testid="edit-role-select"
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    {isLastActiveAdmin && (
                      <div className="form-text text-warning small mt-1">
                        <span className="material-symbols-outlined fs-6 align-text-bottom me-1">warning</span>
                        Cannot change the role of the last active Administrator.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder="e.g. IT Operations"
                      data-testid="edit-department-input"
                    />
                  </div>

                  {/* Active Toggle with Safety Rule Enforcement */}
                  <div className="zen-card p-3 bg-light border">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="editIsActiveSwitch"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        disabled={isEditingSelf || isLastActiveAdmin}
                        data-testid="edit-active-switch"
                      />
                      <label
                        className={`form-check-label fw-semibold small ${
                          isEditingSelf || isLastActiveAdmin ? "text-muted" : ""
                        }`}
                        htmlFor="editIsActiveSwitch"
                      >
                        Account Active
                      </label>
                    </div>

                    {/* Safety Warnings for Self or Last Admin */}
                    {isEditingSelf && (
                      <div className="alert alert-warning py-1 px-2 mt-2 mb-0 small" style={{ fontSize: "12px" }}>
                        <span className="material-symbols-outlined fs-6 align-middle me-1">shield</span>
                        Safety Rule: You cannot deactivate your own currently logged-in Administrator account.
                      </div>
                    )}

                    {!isEditingSelf && isLastActiveAdmin && (
                      <div className="alert alert-warning py-1 px-2 mt-2 mb-0 small" style={{ fontSize: "12px" }}>
                        <span className="material-symbols-outlined fs-6 align-middle me-1">warning</span>
                        Safety Rule: Cannot deactivate the last active Administrator account in the system.
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-zen-primary"
                    disabled={editSubmitting}
                    data-testid="edit-user-submit"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal 3: Reset Password Modal                                     */}
      {/* ------------------------------------------------------------------ */}
      {resettingPasswordUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card shadow">
              <div className="modal-header border-bottom py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-warning fs-4">lock_reset</span>
                  <h2 className="modal-title h5 mb-0 fw-semibold">Reset User Password</h2>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResettingPasswordUser(null)}
                  disabled={resetSubmitting}
                  aria-label="Close"
                ></button>
              </div>

              <form onSubmit={handleResetPasswordSubmit}>
                <div className="modal-body p-4">
                  {resetError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                      {resetError}
                    </div>
                  )}

                  {/* Target User Info Summary */}
                  <div className="zen-card p-3 mb-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold text-dark">{resettingPasswordUser.name}</span>
                      <RoleBadge role={resettingPasswordUser.role} />
                    </div>
                    <div className="text-muted small">{resettingPasswordUser.email}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Temporary Password *</label>
                    <div className="input-group">
                      <input
                        type={showResetPassword ? "text" : "password"}
                        className="form-control"
                        placeholder="Enter new initial password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        required
                        data-testid="reset-password-input"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        aria-label={showResetPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined fs-6">
                          {showResetPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="alert alert-info py-2 px-3 small mb-0" style={{ fontSize: "12px" }}>
                    <span className="material-symbols-outlined fs-6 align-middle me-1">info</span>
                    Setting a new password will automatically flag <strong>mustChangePassword = true</strong>. The user must choose their own new password upon next sign-in.
                  </div>
                </div>

                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setResettingPasswordUser(null)}
                    disabled={resetSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-zen-primary"
                    disabled={resetSubmitting}
                    data-testid="reset-password-submit"
                  >
                    {resetSubmitting ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
