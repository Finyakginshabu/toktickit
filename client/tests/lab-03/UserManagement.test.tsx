import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagement from "../../src/components/UserManagement.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { User } from "../../src/types/index.js";

const mockAdminUser: User = {
  id: 10,
  name: "System Administrator",
  email: "admin@toktickit.local",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

const mockUsers: User[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    department: "Computer Engineering",
  },
  {
    id: 2,
    name: "Alice Support",
    email: "staff.alice@toktickit.local",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    department: "IT Operations",
  },
  {
    id: 3,
    name: "Inactive Staff",
    email: "staff.inactive@toktickit.local",
    role: "IT_STAFF",
    isActive: false,
    mustChangePassword: false,
  },
  {
    id: 10,
    name: "System Administrator",
    email: "admin@toktickit.local",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
  },
];

function renderUserManagement(currentUser: User = mockAdminUser) {
  localStorage.setItem("toktickit_auth_token", "fake-admin-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(currentUser));

  return render(
    <AuthProvider>
      <RequesterProvider>
        <UserManagement />
      </RequesterProvider>
    </AuthProvider>
  );
}

describe("Lab 3 Admin User Management UI Suite (client/tests/lab-03/UserManagement.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(mockUsers);
    vi.spyOn(api, "createAdminUser").mockResolvedValue({
      id: 15,
      name: "New Person",
      email: "new.person@toktickit.local",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    });
    vi.spyOn(api, "updateAdminUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Updated",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    vi.spyOn(api, "resetAdminUserPassword").mockResolvedValue({
      message: "Password reset successfully",
      mustChangePassword: true,
    });
  });

  // UI-07: Table rendering and search/filter controls (AC-18)
  it("renders user management table with Name, Email, Role badges, Status badges, and Action buttons (UI-07, AC-18)", async () => {
    renderUserManagement();

    // Verify Title and Toolbar
    expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();
    expect(screen.getByTestId("user-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("role-filter-select")).toBeInTheDocument();

    // Verify Users Loaded in Table
    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText("Alice Support")).toBeInTheDocument();
      expect(screen.getByText("Inactive Staff")).toBeInTheDocument();
      expect(screen.getByText("System Administrator")).toBeInTheDocument();
    });

    // Check Status Badges
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("filters users when typing in the search bar or changing role filter (AC-18)", async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("user-search-input");
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Alice" })
      );
    });

    const roleSelect = screen.getByTestId("role-filter-select");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "IT_STAFF" })
      );
    });
  });

  // UI-07: Create User Modal
  it("opens Create User modal and creates new user successfully (AC-19, FR-16)", async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText("System Administrator")).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId("create-user-btn");
    fireEvent.click(createBtn);

    expect(screen.getByRole("heading", { name: "Create New User" })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("create-name-input"), {
      target: { value: "New Person" },
    });
    fireEvent.change(screen.getByTestId("create-email-input"), {
      target: { value: "new.person@toktickit.local" },
    });
    fireEvent.change(screen.getByTestId("create-role-select"), {
      target: { value: "REQUESTER" },
    });
    fireEvent.change(screen.getByTestId("create-password-input"), {
      target: { value: "InitialPassword123!" },
    });

    fireEvent.click(screen.getByTestId("create-user-submit"));

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Person",
          email: "new.person@toktickit.local",
          role: "REQUESTER",
          isActive: true,
          initialPassword: "InitialPassword123!",
        })
      );
    });
  });

  // UI-07: Safety Rule - Deactivate toggle disabled on current user row (AC-21, BR-08)
  it("disables the Active toggle when editing the logged-in Administrator account (UI-07, AC-21, BR-08)", async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText("System Administrator")).toBeInTheDocument();
    });

    // Click Edit button on logged-in Admin row (id: 10)
    const editAdminBtn = screen.getByTestId("edit-user-btn-10");
    fireEvent.click(editAdminBtn);

    expect(screen.getByRole("heading", { name: "Edit User Details" })).toBeInTheDocument();

    // Verify Active switch is disabled
    const activeSwitch = screen.getByTestId("edit-active-switch");
    expect(activeSwitch).toBeDisabled();

    // Verify safety warning is displayed
    expect(
      screen.getByText(/Safety Rule: You cannot deactivate your own currently logged-in Administrator account./i)
    ).toBeInTheDocument();
  });

  // UI-07: Safety Rule - Deactivate and Role disabled on last active Administrator (AC-22, BR-09)
  it("disables the Active toggle and Role dropdown when editing the sole active Administrator account (AC-22, BR-09)", async () => {
    // Current user is an IT Staff (for testing editing the last admin from another session)
    const itStaffUser: User = {
      id: 2,
      name: "Alice Support",
      email: "staff.alice@toktickit.local",
      role: "ADMINISTRATOR", // given admin rights
      isActive: true,
      mustChangePassword: false,
    };

    // List has only 1 active admin (id: 10) and others are requesters/staff
    const singleAdminList: User[] = [
      mockUsers[0],
      mockUsers[1],
      mockUsers[3], // id: 10 is the only ADMINISTRATOR
    ];
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(singleAdminList);

    renderUserManagement(itStaffUser);

    await waitFor(() => {
      expect(screen.getByText("System Administrator")).toBeInTheDocument();
    });

    // Open Edit modal for id: 10 (the only administrator)
    const editAdminBtn = screen.getByTestId("edit-user-btn-10");
    fireEvent.click(editAdminBtn);

    const activeSwitch = screen.getByTestId("edit-active-switch");
    expect(activeSwitch).toBeDisabled();

    const roleSelect = screen.getByTestId("edit-role-select");
    expect(roleSelect).toBeDisabled();

    expect(
      screen.getByText(/Cannot change the role of the last active Administrator/i)
    ).toBeInTheDocument();
  });

  // UI-07: Edit User allows modification on regular user
  it("allows editing details and toggling active status on a non-admin user (AC-20, FR-17)", async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    // Click Edit button on Jennifer's row (id: 1)
    const editBtn = screen.getByTestId("edit-user-btn-1");
    fireEvent.click(editBtn);

    expect(screen.getByRole("heading", { name: "Edit User Details" })).toBeInTheDocument();

    const activeSwitch = screen.getByTestId("edit-active-switch");
    expect(activeSwitch).not.toBeDisabled();

    fireEvent.change(screen.getByTestId("edit-name-input"), {
      target: { value: "Jennifer Updated" },
    });
    fireEvent.change(screen.getByTestId("edit-role-select"), {
      target: { value: "IT_STAFF" },
    });

    fireEvent.click(screen.getByTestId("edit-user-submit"));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "Jennifer Updated",
          role: "IT_STAFF",
        })
      );
    });
  });

  // UI-07: Reset Password Modal
  it("opens Reset Password modal and resets temporary password (AC-23, FR-18)", async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    // Click Reset Password button on Jennifer's row (id: 1)
    const resetBtn = screen.getByTestId("reset-pwd-btn-1");
    fireEvent.click(resetBtn);

    expect(screen.getByRole("heading", { name: "Reset User Password" })).toBeInTheDocument();
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(2);

    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "NewTempPassword123!" },
    });

    fireEvent.click(screen.getByTestId("reset-password-submit"));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(
        1,
        "NewTempPassword123!"
      );
    });
  });
});
