import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { Ticket, PaginatedTicketsResponse } from "../../src/types/index.js";

const mockActiveRequesters = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
  },
  {
    id: 2,
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    department: "Information Technology",
  },
];

const mockCategories = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Network" },
];

const mockRelatedSystems = [
  { id: 1, name: "Corporate Laptop" },
  { id: 2, name: "Campus Wi-Fi" },
];

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary: "Laptop battery drains quickly",
    description: "The battery loses charge within 45 minutes.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T10:00:00.000Z",
    attachmentCount: 1,
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

describe("Lab 2 My Tickets Suite (client/tests/lab-02/MyTickets.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem("toktickit_auth_token", "mock-valid-token");
    localStorage.setItem(
      "toktickit_auth_user",
      JSON.stringify({
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        mustChangePassword: false,
        department: "Computer Engineering",
      })
    );
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(mockRelatedSystems);
  });


  // UI-07a: Table row rendering
  it("renders ticket rows with correct ticket number, summary, status, and priority (UI-07, AC-10)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    const testTickets = makePageResponse([
      makeTicket({
        id: 10,
        ticketNumber: "TKT-2026-000010",
        summary: "VPN connection dropping constantly",
        currentStatus: "NEW",
        requestedPriority: "HIGH",
      }),
    ]);

    vi.spyOn(api, "getTickets").mockResolvedValue(testTickets);

    render(<App />);

    expect((await screen.findAllByText("TKT-2026-000010")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("VPN connection dropping constantly").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NEW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
  });

  // UI-07b: Empty state
  it("renders empty state with Create Ticket CTA when requester has no tickets (UI-07, AC-12)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");
    vi.spyOn(api, "getTickets").mockResolvedValue(makePageResponse([]));

    render(<App />);

    expect(await screen.findByText(/You haven't submitted any tickets yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Create Ticket/i }).length).toBeGreaterThan(0);
  });

  // UI-07c: No-results state on filter mismatch
  it("renders no-results state with Clear Filters CTA when filters return empty data (UI-07, AC-12)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    // First return a ticket, then return empty on filter
    vi.spyOn(api, "getTickets")
      .mockResolvedValueOnce(makePageResponse([makeTicket()]))
      .mockResolvedValueOnce(makePageResponse([]));

    render(<App />);

    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);

    // Type a filter search that yields no results
    const searchInput = screen.getByLabelText(/Search tickets/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentKeyword" } });

    // No-results state appears
    expect(await screen.findByText(/No matching tickets found/i)).toBeInTheDocument();
    const clearFiltersBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    expect(clearFiltersBtns.length).toBeGreaterThan(0);
  });

  // UI-07d: Pagination controls
  it("pagination footer renders page info and Next button advances to page 2 (UI-07, FR-10)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    const page1 = makePageResponse(
      [makeTicket({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Page 1 Ticket" })],
      1,
      1,
      2
    );
    const page2 = makePageResponse(
      [makeTicket({ id: 2, ticketNumber: "TKT-2026-000002", summary: "Page 2 Ticket" })],
      2,
      1,
      2
    );

    const getTicketsSpy = vi
      .spyOn(api, "getTickets")
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    render(<App />);

    expect((await screen.findAllByText("Page 1 Ticket")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Next page/i });
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(getTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });
});
