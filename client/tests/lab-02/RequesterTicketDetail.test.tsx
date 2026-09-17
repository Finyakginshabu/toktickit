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
    summary: "Screen flickers on video call",
    description: "Laptop screen displays flickering artifacts during Teams call.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T10:00:00.000Z",
    attachmentCount: 1,
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 1, name: "Corporate Laptop" },
    requester: {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Computer Engineering",
    },
    attachments: [
      {
        id: 101,
        ticketId: 1,
        originalName: "screen_issue.png",
        fileSize: 1048576,
        mimeType: "image/png",
        isRemoved: false,
        uploadedAt: "2026-09-03T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function makePageResponse(tickets: Ticket[]): PaginatedTicketsResponse {
  return {
    data: tickets,
    pagination: {
      page: 1,
      pageSize: 10,
      total: tickets.length,
      totalPages: 1,
    },
  };
}

describe("Lab 2 Requester Ticket Detail Suite (client/tests/lab-02/RequesterTicketDetail.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(mockRelatedSystems);
  });

  // UI-08a: Read-only fields rendered for ticket owner
  it("renders read-only fields, badges, and attachment section for owned ticket (UI-08, AC-13, FR-11, BR-15)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    const sampleTicket = makeTicket();
    vi.spyOn(api, "getTickets").mockResolvedValue(makePageResponse([sampleTicket]));
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(sampleTicket);

    render(<App />);

    // In My Tickets, click the ticket link to navigate to Ticket Detail
    const ticketLink = (await screen.findAllByText("TKT-2026-000001"))[0];
    fireEvent.click(ticketLink);

    // Detail view rendered
    expect(await screen.findByTestId("ticket-detail-view")).toBeInTheDocument();

    // Verify Read-Only inputs
    const summaryInput = screen.getByLabelText("Ticket Summary") as HTMLInputElement;
    expect(summaryInput.value).toBe("Screen flickers on video call");
    expect(summaryInput.readOnly).toBe(true);
    expect(summaryInput.className).toContain("zen-input-readonly");

    const descriptionTextarea = screen.getByLabelText("Ticket Description") as HTMLTextAreaElement;
    expect(descriptionTextarea.value).toBe("Laptop screen displays flickering artifacts during Teams call.");
    expect(descriptionTextarea.readOnly).toBe(true);
    expect(descriptionTextarea.className).toContain("zen-input-readonly");

    // Verify Metadata labels and values
    const requesterInput = screen.getByLabelText("Requester") as HTMLInputElement;
    expect(requesterInput.value).toContain("Jennifer Anderson");
    expect(requesterInput.readOnly).toBe(true);

    const categoryInput = screen.getByLabelText("Category") as HTMLInputElement;
    expect(categoryInput.value).toBe("Hardware");
    expect(categoryInput.readOnly).toBe(true);

    const systemInput = screen.getByLabelText("Related System") as HTMLInputElement;
    expect(systemInput.value).toBe("Corporate Laptop");
    expect(systemInput.readOnly).toBe(true);

    // Verify Status & Priority badges
    expect(screen.getAllByText("NEW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);

    // Verify Attachment Section is embedded
    expect(screen.getByTestId("attachment-section")).toBeInTheDocument();
    expect(screen.getByText("screen_issue.png")).toBeInTheDocument();
  });

  // UI-08b: Cross-requester / unauthorized ticket access displays error alert
  it("displays unauthorized error alert when accessing non-owned ticket (UI-08, AC-14, BR-05)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    vi.spyOn(api, "getTickets").mockResolvedValue(
      makePageResponse([makeTicket({ id: 99, ticketNumber: "TKT-2026-000099" })])
    );

    const forbiddenErr = new Error("Access denied. You do not own this ticket.");
    (forbiddenErr as any).code = "FORBIDDEN";
    (forbiddenErr as any).status = 403;
    vi.spyOn(api, "getTicketDetail").mockRejectedValue(forbiddenErr);

    render(<App />);

    const ticketLink = (await screen.findAllByText("TKT-2026-000099"))[0];
    fireEvent.click(ticketLink);

    // Error view rendered
    expect(await screen.findByTestId("ticket-detail-error")).toBeInTheDocument();
    expect(screen.getByText(/Unauthorized Access Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Access denied\. You do not own this ticket\./i)).toBeInTheDocument();
  });

  // UI-08c: Back button navigates back to My Tickets list
  it("clicking Back to My Tickets returns to the ticket list (UI-08, AC-13)", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");

    const sampleTicket = makeTicket();
    vi.spyOn(api, "getTickets").mockResolvedValue(makePageResponse([sampleTicket]));
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(sampleTicket);

    render(<App />);

    const ticketLink = (await screen.findAllByText("TKT-2026-000001"))[0];
    fireEvent.click(ticketLink);

    expect(await screen.findByTestId("ticket-detail-view")).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /Back to My Tickets/i });
    fireEvent.click(backBtn);

    // Returned to My Tickets list
    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
  });
});
