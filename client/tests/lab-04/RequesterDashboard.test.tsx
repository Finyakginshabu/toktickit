import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { RequesterDashboardResponse } from "../../src/types/index.js";

const mockRequesterUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockDashboardData: RequesterDashboardResponse = {
  metrics: {
    myOpenTickets: 5,
    inProgressTickets: 2,
    resolvedTickets: 3,
    closedTickets: 8,
    waitingForRequesterTickets: 1,
  },
  drillDownUrls: {
    myOpenTickets: "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
    inProgressTickets: "/my-tickets?status=IN_PROGRESS",
    resolvedTickets: "/my-tickets?status=RESOLVED",
    closedTickets: "/my-tickets?status=CLOSED",
    waitingForRequesterTickets: "/my-tickets?status=WAITING_FOR_REQUESTER",
  },
  recentTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "MEDIUM",
      updatedAt: "2026-10-01T09:14:00.000Z",
      categoryName: "Hardware",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Wi-Fi keeps dropping in library",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      updatedAt: "2026-10-01T10:00:00.000Z",
      categoryName: "Network",
    },
  ],
};

function renderDashboard() {
  localStorage.setItem("toktickit_auth_token", "mock-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));

  return render(
    <AuthProvider>
      <RequesterProvider>
        <RequesterDashboard />
      </RequesterProvider>
    </AuthProvider>
  );
}

describe("Requester Dashboard UI Suite (UI-08, UI-11 per AC-13, FR-14, BR-12, BR-15)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders welcome greeting, 4 metric cards, and attention banner (UI-08, AC-13, FR-14)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);
    renderDashboard();

    // Greeting
    expect(await screen.findByText(/Welcome, Jennifer Anderson!/i)).toBeInTheDocument();
    expect(screen.getByText(/Here's the latest on your requests/i)).toBeInTheDocument();

    // 4 Metric Cards
    expect(screen.getByText("My Open")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // Attention alert banner
    expect(screen.getByText(/You have 1 ticket\(s\) waiting for your response/i)).toBeInTheDocument();

    // Recent tickets table
    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi keeps dropping in library")).toBeInTheDocument();

    // Quick Actions
    expect(screen.getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View My Tickets/i })).toBeInTheDocument();
  });

  it("renders empty state with CTA button when requester has zero tickets (UI-08, AC-13)", async () => {
    const emptyData: RequesterDashboardResponse = {
      metrics: {
        myOpenTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        waitingForRequesterTickets: 0,
      },
      drillDownUrls: mockDashboardData.drillDownUrls,
      recentTickets: [],
    };

    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(emptyData);
    renderDashboard();

    expect((await screen.findAllByText("0")).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/You have not submitted any tickets yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Your First Ticket/i })).toBeInTheDocument();

    // No attention banner when waitingForRequesterTickets === 0
    expect(screen.queryByText(/waiting for your response/i)).not.toBeInTheDocument();
  });

  it("navigates with multi-status filter when clicking My Open card (UI-11, AC-16, BR-15)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    renderDashboard();

    const openCard = await screen.findByLabelText(/My Open tickets: 5/i);
    fireEvent.click(openCard);

    expect(pushStateSpy).toHaveBeenCalledWith(
      {},
      "",
      "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"
    );
  });

  it("displays safe failure alert banner with retry button on network error", async () => {
    vi.spyOn(api, "getRequesterDashboard")
      .mockRejectedValueOnce(new Error("Unable to connect to TokTickIT API"))
      .mockResolvedValueOnce(mockDashboardData);

    renderDashboard();

    expect(await screen.findByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);

    expect(await screen.findByText(/Welcome, Jennifer Anderson!/i)).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
  });
});
