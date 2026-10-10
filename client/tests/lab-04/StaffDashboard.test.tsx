import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import AdminDashboard from "../../src/components/AdminDashboard.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { StaffDashboardResponse, AdminDashboardResponse } from "../../src/types/index.js";

const mockStaffUser = {
  id: 2,
  name: "Alice Support",
  email: "staff.alice@toktickit.local",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const mockAdminUser = {
  id: 3,
  name: "System Administrator",
  email: "admin@toktickit.local",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockStaffData: StaffDashboardResponse = {
  metrics: {
    newTickets: 14,
    openTickets: 23,
    inProgressTickets: 18,
    waitingForRequesterTickets: 7,
    myAssignedTickets: 16,
    unassignedTickets: 9,
    highUrgentTickets: 11,
    myOpenActionsCount: 4,
  },
  deltas: {
    newTickets: 1,
    openTickets: -2,
    inProgressTickets: -1,
    waitingForRequesterTickets: 0,
    myAssignedTickets: 3,
  },
  drillDownUrls: {
    newTickets: "/staff/queue?status=NEW",
    openTickets: "/staff/queue?status=OPEN",
    inProgressTickets: "/staff/queue?status=IN_PROGRESS",
    waitingForRequesterTickets: "/staff/queue?status=WAITING_FOR_REQUESTER",
    myAssignedTickets: "/staff/queue?ownerId=me",
    unassignedTickets: "/staff/queue?ownerId=unassigned",
    highUrgentTickets: "/staff/queue?itPriority=HIGH,URGENT",
  },
  recentTickets: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "VPN connection drops after 10 minutes",
      currentStatus: "OPEN",
      itPriority: "HIGH",
      requesterName: "Jennifer Anderson",
      ticketOwnerName: "Alice Support",
      updatedAt: "2026-10-01T10:15:00.000Z",
      categoryName: "Network",
    },
  ],
};

const mockAdminData: AdminDashboardResponse = {
  ...mockStaffData,
  drillDownUrls: {
    ...mockStaffData.drillDownUrls,
    manageUsers: "/admin/users",
  },
  ticketMetrics: mockStaffData.metrics,
  userMetrics: {
    totalUsers: 12,
    activeUsers: 10,
    inactiveUsers: 2,
    usersByRole: {
      REQUESTER: 6,
      IT_STAFF: 4,
      ADMINISTRATOR: 2,
    },
  },
};

function renderStaffDashboard(user: any = mockStaffUser) {
  localStorage.setItem("toktickit_auth_token", "mock-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(user));

  return render(
    <AuthProvider>
      <RequesterProvider>
        <StaffDashboard />
      </RequesterProvider>
    </AuthProvider>
  );
}

function renderAdminDashboard(user: any = mockAdminUser) {
  localStorage.setItem("toktickit_auth_token", "mock-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(user));

  return render(
    <AuthProvider>
      <RequesterProvider>
        <AdminDashboard />
      </RequesterProvider>
    </AuthProvider>
  );
}

describe("IT Staff & Admin Dashboard UI Suite (UI-09, UI-10, UI-11, UI-14)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // UI-09: Staff Dashboard Cards, Deltas, and Secondary Bar
  // ---------------------------------------------------------------------------
  it("renders 5 primary cards, deltas, and secondary indicators (UI-09, AC-14, FR-15)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockStaffData);

    renderStaffDashboard();

    // Greeting
    expect(await screen.findByText(/Welcome back, Alice Support!/i)).toBeInTheDocument();

    // 5 Primary metric cards
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("+1 from yesterday")).toBeInTheDocument();

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("-2 from yesterday")).toBeInTheDocument();

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("-1 from yesterday")).toBeInTheDocument();

    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("0 from yesterday")).toBeInTheDocument();

    expect(screen.getByText("My Assigned")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("+3 from yesterday")).toBeInTheDocument();

    // Secondary indicators bar
    expect(screen.getByText("Unassigned:")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("High / Urgent:")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("My Open Actions:")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    // Recent Tickets
    expect(screen.getByText("TKT-2026-000201")).toBeInTheDocument();
    expect(screen.getByText("VPN connection drops after 10 minutes")).toBeInTheDocument();

    // Quick Actions
    expect(screen.getByRole("button", { name: /Search Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My Queue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unassigned Queue/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // UI-10: Administrator System Overview User Stats
  // ---------------------------------------------------------------------------
  it("renders Admin System Overview card with total, active, and role breakdown (UI-10, AC-15, FR-16)", async () => {
    vi.spyOn(api, "getAdminDashboard").mockResolvedValue(mockAdminData);

    renderAdminDashboard();

    expect(await screen.findByText(/Welcome back, System Administrator!/i)).toBeInTheDocument();
    expect(screen.getByText(/Administrator System Overview/i)).toBeInTheDocument();

    // User counts
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    expect(screen.getByText("Inactive Users")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);

    // Role breakdown
    expect(screen.getByText((_, el) => el?.textContent?.trim() === "Requester: 6")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent?.trim() === "IT Staff: 4")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent?.trim() === "Admin: 2")).toBeInTheDocument();

    // Manage Users CTA button
    expect(screen.getByRole("button", { name: /Manage Users/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // UI-11: Drill-Down Navigation
  // ---------------------------------------------------------------------------
  describe("UI-11: Drill-Down Navigation Handler", () => {
    it("navigates to pre-filtered queue when clicking HIGH/URGENT priority indicator", async () => {
      vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockStaffData);
      const pushStateSpy = vi.spyOn(window.history, "pushState");

      renderStaffDashboard();

      const priorityIndicator = await screen.findByLabelText(/High or Urgent priority tickets: 11/i);
      fireEvent.click(priorityIndicator);

      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/staff/queue?itPriority=HIGH,URGENT");
    });

    it("navigates to my assigned queue when clicking My Assigned card", async () => {
      vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockStaffData);
      const pushStateSpy = vi.spyOn(window.history, "pushState");

      renderStaffDashboard();

      const myAssignedCard = await screen.findByLabelText(/My Assigned tickets: 16/i);
      fireEvent.click(myAssignedCard);

      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/staff/queue?ownerId=me");
    });
  });

  // ---------------------------------------------------------------------------
  // UI-14: 403 Forbidden State View
  // ---------------------------------------------------------------------------
  describe("UI-14: Dashboard 403 Forbidden State View", () => {
    it("renders 403 view with lock icon when Requester accesses Staff Dashboard", async () => {
      renderStaffDashboard(mockRequesterUser);

      expect(screen.getByText("403 - Access Forbidden")).toBeInTheDocument();
      expect(screen.getByText(/Access is restricted to authorized IT Staff and Administrators/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Return to My Dashboard/i })).toBeInTheDocument();
    });

    it("renders 403 view when IT Staff accesses Admin Dashboard", async () => {
      renderAdminDashboard(mockStaffUser);

      expect(screen.getByText("403 - Access Forbidden")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Return to My Dashboard/i })).toBeInTheDocument();
    });
  });
});
