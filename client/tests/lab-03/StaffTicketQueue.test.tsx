import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import AppHeader from "../../src/components/AppHeader.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Ticket, PaginatedTicketsResponse } from "../../src/types/index.js";

const mockCategories = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Network" },
  { id: 3, name: "Software" },
];

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary: "Laptop battery drains quickly",
    description: "The battery drops from 100% to 20% in 45 minutes.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    ticketOwnerId: null,
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T10:00:00.000Z",
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer@kmutt.ac.th" },
    ticketOwner: null,
    category: { id: 1, name: "Hardware" },
    ...overrides,
  };
}

function makePageResponse(
  tickets: Ticket[],
  page = 1,
  pageSize = 10,
  total = tickets.length
): PaginatedTicketsResponse {
  return {
    data: tickets,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

describe("Lab 3 Staff Ticket Queue & Role Navigation Suite (client/tests/lab-03/StaffTicketQueue.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: mockCategories });
  });

  // ---------------------------------------------------------------------------
  // UI-03: Role-based Navigation Tabs (AC-07, FR-05)
  // ---------------------------------------------------------------------------
  describe("UI-03: Role-based Navigation Rendering", () => {
    it("renders Requester navigation: My Tickets and Create Ticket (UI-03, AC-07, FR-05)", async () => {
      localStorage.setItem("toktickit_auth_token", "mock-requester-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer@kmutt.ac.th",
          role: "REQUESTER",
          mustChangePassword: false,
        })
      );
      vi.spyOn(api, "getTickets").mockResolvedValue(makePageResponse([]));

      render(
        <AuthProvider>
          <RequesterProvider>
            <AppHeader />
          </RequesterProvider>
        </AuthProvider>
      );

      // Should show My Tickets and Create Ticket
      expect(screen.getAllByRole("button", { name: /My Tickets/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Create Ticket/i }).length).toBeGreaterThan(0);

      // Should NOT show Ticket Queue or User Management
      expect(screen.queryByRole("button", { name: /Ticket Queue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /User Management/i })).not.toBeInTheDocument();
    });

    it("renders IT Staff navigation: Ticket Queue and Create Ticket (UI-03, AC-07, FR-05)", async () => {
      localStorage.setItem("toktickit_auth_token", "mock-staff-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 2,
          name: "Alice Support",
          email: "staff.alice@toktickit.local",
          role: "IT_STAFF",
          mustChangePassword: false,
        })
      );

      render(
        <AuthProvider>
          <RequesterProvider>
            <AppHeader />
          </RequesterProvider>
        </AuthProvider>
      );

      // Should show Ticket Queue and Create Ticket
      expect(screen.getAllByRole("button", { name: /Ticket Queue/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Create Ticket/i }).length).toBeGreaterThan(0);

      // Should NOT show My Tickets or User Management
      expect(screen.queryByRole("button", { name: /My Tickets/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /User Management/i })).not.toBeInTheDocument();
    });

    it("renders Administrator navigation: User Management (UI-03, AC-07, FR-05)", async () => {
      localStorage.setItem("toktickit_auth_token", "mock-admin-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 3,
          name: "System Administrator",
          email: "admin@toktickit.local",
          role: "ADMINISTRATOR",
          mustChangePassword: false,
        })
      );

      render(
        <AuthProvider>
          <RequesterProvider>
            <AppHeader />
          </RequesterProvider>
        </AuthProvider>
      );

      // Should show User Management
      expect(screen.getAllByRole("button", { name: /User Management/i }).length).toBeGreaterThan(0);

      // Should NOT show My Tickets or Ticket Queue
      expect(screen.queryByRole("button", { name: /My Tickets/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ticket Queue/i })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // UI-04: Staff Ticket Queue Table, Filter, Search, and Pagination (AC-10, FR-08)
  // ---------------------------------------------------------------------------
  describe("UI-04: Staff Ticket Queue Screen", () => {
    beforeEach(() => {
      localStorage.setItem("toktickit_auth_token", "mock-staff-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 2,
          name: "Alice Support",
          email: "staff.alice@toktickit.local",
          role: "IT_STAFF",
          mustChangePassword: false,
        })
      );
    });

    it("renders ticket rows with Ticket No., Created, Summary, Category, Priority, IT Priority, Status, and Owner (UI-04, AC-10)", async () => {
      const staffTickets = makePageResponse([
        makeTicket({
          id: 12,
          ticketNumber: "TKT-2026-000012",
          summary: "Campus VPN disconnects intermittently",
          currentStatus: "IN_PROGRESS",
          requestedPriority: "HIGH",
          itPriority: "URGENT",
          ticketOwner: { id: 2, name: "Alice Support", email: "alice@toktickit.local", role: "IT_STAFF", mustChangePassword: false },
        }),
      ]);

      vi.spyOn(api, "getStaffTickets").mockResolvedValue(staffTickets);

      render(<App />);

      expect((await screen.findAllByText("TKT-2026-000012")).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Campus VPN disconnects intermittently").length).toBeGreaterThan(0);
      expect(screen.getAllByText("IN PROGRESS").length).toBeGreaterThan(0);
      expect(screen.getAllByText("URGENT").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alice Support").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Open Detail/i }).length).toBeGreaterThan(0);
    });

    it("renders empty state when there are zero tickets in queue (UI-04, AC-10)", async () => {
      vi.spyOn(api, "getStaffTickets").mockResolvedValue(makePageResponse([]));

      render(<App />);

      expect(await screen.findByText(/No tickets in queue/i)).toBeInTheDocument();
      expect(screen.getByText(/There are currently no tickets submitted across the organization/i)).toBeInTheDocument();
    });

    it("renders no-results state with Clear Filters button when filter returns empty data (UI-04, AC-10)", async () => {
      vi.spyOn(api, "getStaffTickets")
        .mockResolvedValueOnce(makePageResponse([makeTicket()]))
        .mockResolvedValueOnce(makePageResponse([]));

      render(<App />);

      expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);

      // Search non-existent keyword
      const searchInput = screen.getByLabelText(/Search tickets/i);
      fireEvent.change(searchInput, { target: { value: "NoSuchTicketKeyword" } });

      expect(await screen.findByText(/No tickets match your filter criteria/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Clear Filters/i }).length).toBeGreaterThan(0);
    });

    it("filters by category, status, priority, and ownership filters (UI-04, FR-08)", async () => {
      const getSpy = vi.spyOn(api, "getStaffTickets").mockResolvedValue(makePageResponse([makeTicket()]));

      render(<App />);

      expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);

      // Filter by Category
      const catSelect = screen.getByLabelText(/Filter by Category/i);
      fireEvent.change(catSelect, { target: { value: "1" } });
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 1 }));
      });

      // Filter by Status
      const statusSelect = screen.getByLabelText(/Filter by Status/i);
      fireEvent.change(statusSelect, { target: { value: "NEW" } });
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "NEW" }));
      });

      // Filter by IT Priority
      const prioritySelect = screen.getByLabelText(/Filter by IT Priority/i);
      fireEvent.change(prioritySelect, { target: { value: "HIGH" } });
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ itPriority: "HIGH" }));
      });

      // Filter by Ownership: Assigned to Me
      const ownerSelect = screen.getByLabelText(/Filter by Ownership/i);
      fireEvent.change(ownerSelect, { target: { value: "me" } });
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 2 }));
      });

      // Filter by Ownership: Unassigned
      fireEvent.change(ownerSelect, { target: { value: "unassigned" } });
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "unassigned" }));
      });
    });

    it("Clear Filters resets all search and filter dropdowns (UI-04)", async () => {
      vi.spyOn(api, "getStaffTickets").mockResolvedValue(makePageResponse([makeTicket()]));

      render(<App />);

      expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);

      const searchInput = screen.getByLabelText(/Search tickets/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "network" } });
      expect(searchInput.value).toBe("network");

      const clearBtn = screen.getByLabelText(/Clear Filters/i);
      expect(clearBtn).not.toBeDisabled();
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(searchInput.value).toBe("");
      });
    });

    it("pagination footer renders and advances pages (UI-04, FR-08)", async () => {
      const getSpy = vi.spyOn(api, "getStaffTickets").mockResolvedValue(
        makePageResponse([makeTicket()], 1, 10, 25)
      );

      render(<App />);

      expect(await screen.findByText(/Page 1 of 3 \(25 total tickets\)/i)).toBeInTheDocument();

      const nextBtn = screen.getByRole("button", { name: /Next page/i });
      expect(nextBtn).not.toBeDisabled();
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
      });
    });

    it("navigates to ticket-detail when clicking Open Detail or row (UI-04)", async () => {
      vi.spyOn(api, "getStaffTickets").mockResolvedValue(
        makePageResponse([makeTicket({ id: 42, ticketNumber: "TKT-2026-000042" })])
      );
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(
        makeTicket({ id: 42, ticketNumber: "TKT-2026-000042" })
      );

      render(<App />);

      expect((await screen.findAllByText("TKT-2026-000042")).length).toBeGreaterThan(0);

      const openDetailBtns = screen.getAllByRole("button", { name: /Open Detail/i });
      fireEvent.click(openDetailBtns[0]);

      // Should transition to ticket detail
      expect(await screen.findByTestId("ticket-detail-view")).toBeInTheDocument();
    });
  });
});
