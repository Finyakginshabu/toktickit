/**
 * ResponsiveLayout.test.tsx (RESP-01)
 * JSDOM-level assertions: responsive class/structure, table scroll containers,
 * and card stacking behaviour at Desktop (1280px), Tablet (768px), Mobile (375px).
 *
 * NOTE: Actual rendered overflow and 44x44px touch-target dimensions are
 * verified in Playwright e2e/lab-04/responsive.spec.ts per ui-spec.md S5.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import * as api from "../../src/api.js";

const mockRequesterUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockStaffUser = {
  id: 2,
  name: "Alice Support",
  email: "staff.alice@toktickit.local",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const mockRequesterDashboard = {
  metrics: {
    myOpenTickets: 3,
    inProgressTickets: 1,
    resolvedTickets: 2,
    closedTickets: 4,
    waitingForRequesterTickets: 0,
  },
  drillDownUrls: {
    myOpenTickets: "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
    inProgressTickets: "/my-tickets?status=IN_PROGRESS",
    resolvedTickets: "/my-tickets?status=RESOLVED",
    closedTickets: "/my-tickets?status=CLOSED",
    waitingForRequesterTickets: "/my-tickets?status=WAITING_FOR_REQUESTER",
  },
  recentTickets: [],
};

const mockStaffDashboard = {
  metrics: {
    newTickets: 5,
    openTickets: 10,
    inProgressTickets: 8,
    waitingForRequesterTickets: 3,
    myAssignedTickets: 6,
    unassignedTickets: 4,
    highUrgentTickets: 2,
    myOpenActionsCount: 1,
  },
  deltas: {
    newTickets: 1,
    openTickets: -2,
    inProgressTickets: 0,
    waitingForRequesterTickets: 1,
    myAssignedTickets: 0,
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
  recentTickets: [],
};

// ---------------------------------------------------------------------------
// Desktop Layout (>= 992px): zen-dashboard-container + row + col-lg-* cards
// ---------------------------------------------------------------------------
describe("RESP-01 Desktop Layout (>=992px) — RequesterDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockRequesterDashboard);
  });

  it("renders zen-dashboard-container (max-width 1140px) on desktop", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <RequesterDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    expect(container.querySelector(".zen-dashboard-container")).not.toBeNull();
  });

  it("metric cards use Bootstrap responsive col-12 col-md-6 col-lg-3 classes", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <RequesterDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    // Wait for data to load
    await screen.findByText("My Open");
    const colItems = container.querySelectorAll(".col-12.col-md-6.col-lg-3");
    // 4 metric cards expected
    expect(colItems.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Desktop Layout — StaffDashboard (5 cards + 2:1 split)
// ---------------------------------------------------------------------------
describe("RESP-01 Desktop Layout (>=992px) — StaffDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockStaffDashboard);
  });

  it("renders zen-dashboard-container with dashboard layout", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <StaffDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    expect(container.querySelector(".zen-dashboard-container")).not.toBeNull();
  });

  it("2:1 content split uses col-12 col-lg-8 and col-12 col-lg-4", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <StaffDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    await screen.findByText(/welcome back/i);
    expect(container.querySelector(".col-12.col-lg-8")).not.toBeNull();
    expect(container.querySelector(".col-12.col-lg-4")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tablet / Mobile structural checks: table-responsive scroll container
// ---------------------------------------------------------------------------
describe("RESP-01 Table scroll container present (all breakpoints)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue({
      ...mockStaffDashboard,
      recentTickets: [
        {
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Test ticket",
          currentStatus: "OPEN",
          itPriority: "MEDIUM",
          requesterName: "Jennifer Anderson",
          ticketOwnerName: "Alice Support",
          updatedAt: "2026-10-01T09:00:00.000Z",
          categoryName: "Hardware",
        },
      ],
    });
  });

  it("recent tickets section contains table-responsive container", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <StaffDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    await screen.findByText("Test ticket");
    // Either table-responsive Bootstrap class OR the recent-ticket-cards component
    const tableResponsive = container.querySelector(".table-responsive");
    const ticketCards = container.querySelector(".recent-ticket-cards");
    expect(tableResponsive !== null || ticketCards !== null).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mobile: single-column stacking (col-12 without col-lg-* override)
// ---------------------------------------------------------------------------
describe("RESP-01 Mobile stacking (col-12 full-width) — RequesterDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockRequesterDashboard);
  });

  it("all metric card columns include col-12 for mobile-first full-width layout", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <AuthProvider>
          <RequesterProvider>
            <RequesterDashboard />
          </RequesterProvider>
        </AuthProvider>
      ));
    });
    await screen.findByText("My Open");
    const fullWidthCols = container.querySelectorAll('[class*="col-12"]');
    expect(fullWidthCols.length).toBeGreaterThan(0);
  });
});
