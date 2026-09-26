import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Ticket, User, PublicComment, InternalNote } from "../../src/types/index.js";

const mockStaffUser: User = {
  id: 2,
  name: "Alice Support",
  email: "staff.alice@toktickit.local",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const mockStaffList: User[] = [
  mockStaffUser,
  {
    id: 3,
    name: "Bob Technician",
    email: "staff.bob@toktickit.local",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  },
];

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    requesterId: 1,
    categoryId: 4,
    relatedSystemId: 3,
    summary: "Cannot access campus VPN from off-campus",
    description: "Full description of VPN connectivity disruption.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    ticketOwnerId: null,
    problemAppearsResolved: false,
    createdAt: "2026-09-17T10:00:00.000Z",
    updatedAt: "2026-09-17T10:00:00.000Z",
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer@kmutt.ac.th" },
    ticketOwner: null,
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 3, name: "VPN" },
    attachments: [],
    ...overrides,
  };
}

const mockComments: PublicComment[] = [
  {
    id: 1,
    ticketId: 12,
    content: "We have checked the VPN gateway and need more log info.",
    author: { id: 2, name: "Alice Support", role: "IT_STAFF" },
    createdAt: "2026-09-17T10:15:00.000Z",
  },
];

const mockNotes: InternalNote[] = [
  {
    id: 1,
    ticketId: 12,
    content: "Known issue on Gateway cluster 3 after firmware update.",
    author: { id: 2, name: "Alice Support", role: "IT_STAFF" },
    createdAt: "2026-09-17T10:12:00.000Z",
  },
];

function renderStaffTicketDetail(initialTicket: Ticket) {
  // Set window path and localStorage to simulate viewing ticket #12 as Alice Support
  localStorage.setItem("toktickit_auth_token", "mock-staff-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
  window.history.pushState({ tab: "ticket-detail", ticketId: initialTicket.id }, "", `/staff/tickets/${initialTicket.id}`);

  return render(
    <AuthProvider>
      <RequesterProvider>
        <StaffTicketDetail />
      </RequesterProvider>
    </AuthProvider>
  );
}

describe("Lab 3 Staff Ticket Detail Operational Controls & Discussions Suite (UI-05, UI-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getActiveStaffUsers").mockResolvedValue(mockStaffList);
    vi.spyOn(api, "getPublicComments").mockResolvedValue(mockComments);
    vi.spyOn(api, "getInternalNotes").mockResolvedValue(mockNotes);
  });

  // =========================================================================
  // UI-05: Staff Ticket Detail Ownership & Priority Controls (AC-11, AC-13)
  // =========================================================================
  describe("UI-05: Ownership, Priority, and Status Controls", () => {
    it("renders ticket operational details with claim button for unassigned ticket (UI-05, AC-11)", async () => {
      const ticket = makeTicket({ ticketOwnerId: null });
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByText("TKT-2026-000012")).toBeInTheDocument();
      });

      // Shows Summary, Category, and Requester
      expect(screen.getByDisplayValue("Cannot access campus VPN from off-campus")).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Jennifer Anderson/i)).toBeInTheDocument();

      // Claim button should be visible when ticket is unassigned
      const claimBtn = screen.getByTestId("claim-ticket-btn");
      expect(claimBtn).toBeInTheDocument();
    });

    it("clicking Claim Ticket triggers ownership assignment and updates state (UI-05, AC-11)", async () => {
      const ticket = makeTicket({ ticketOwnerId: null });
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const claimSpy = vi.spyOn(api, "claimOrAssignTicket").mockResolvedValue({
        id: 12,
        ticketOwnerId: 2,
        currentStatus: "OPEN",
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByTestId("claim-ticket-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("claim-ticket-btn"));

      await waitFor(() => {
        expect(claimSpy).toHaveBeenCalledWith(12, 2);
      });
    });

    it("changing Owner dropdown triggers claimOrAssignTicket with selected owner (UI-05, AC-12)", async () => {
      const ticket = makeTicket({ ticketOwnerId: null });
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const assignSpy = vi.spyOn(api, "claimOrAssignTicket").mockResolvedValue({
        id: 12,
        ticketOwnerId: 3,
        currentStatus: "OPEN",
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByTestId("owner-select")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("owner-select"), { target: { value: "3" } });

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledWith(12, 3);
      });
    });

    it("changing IT Priority dropdown calls updateTicketPriority (UI-05, AC-13)", async () => {
      const ticket = makeTicket({ itPriority: "HIGH", requestedPriority: "HIGH" });
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const prioritySpy = vi.spyOn(api, "updateTicketPriority").mockResolvedValue({
        id: 12,
        itPriority: "URGENT",
        requestedPriority: "HIGH",
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("it-priority-select"), { target: { value: "URGENT" } });

      await waitFor(() => {
        expect(prioritySpy).toHaveBeenCalledWith(12, "URGENT");
      });
    });

    it("clicking permitted status transition opens confirmation modal and confirms transition (UI-05, AC-14)", async () => {
      const ticket = makeTicket({ currentStatus: "OPEN" });
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const statusSpy = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({
        id: 12,
        currentStatus: "IN_PROGRESS",
        resolutionSummary: null,
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByTestId("status-transition-IN_PROGRESS")).toBeInTheDocument();
      });

      // Click transition button
      fireEvent.click(screen.getByTestId("status-transition-IN_PROGRESS"));

      // Confirmation modal should appear
      await waitFor(() => {
        expect(screen.getByText("Confirm Status Transition")).toBeInTheDocument();
      });

      // Click confirm in modal
      fireEvent.click(screen.getByTestId("confirm-status-btn"));

      await waitFor(() => {
        expect(statusSpy).toHaveBeenCalledWith(12, "IN_PROGRESS", undefined);
      });
    });
  });

  // =========================================================================
  // UI-06: Comments vs Notes Distinct Visual Styling (AC-16, AC-17)
  // =========================================================================
  describe("UI-06: Discussions Stream Visual Distinction & Submission", () => {
    it("renders Public Comments panel and Private Internal Notes panel with distinct security styling (UI-06, AC-16, AC-17)", async () => {
      const ticket = makeTicket();
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
        expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
      });

      // Public comments panel shows public title & text
      expect(screen.getByText("Public Comments")).toBeInTheDocument();
      expect(screen.getByText("Visible to Requester and Support Staff")).toBeInTheDocument();

      // Internal notes panel shows warning badge & lock icon
      expect(screen.getByText("Internal Notes")).toBeInTheDocument();
      expect(screen.getByText("Confidential: Visible only to IT Staff & Admin")).toBeInTheDocument();

      // Verify sample contents rendered
      expect(screen.getByText(/We have checked the VPN gateway/i)).toBeInTheDocument();
      expect(screen.getByText(/Known issue on Gateway cluster 3/i)).toBeInTheDocument();
    });

    it("submitting a public comment invokes createPublicComment (UI-06, AC-16)", async () => {
      const ticket = makeTicket();
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const postCommentSpy = vi.spyOn(api, "createPublicComment").mockResolvedValue({
        id: 2,
        ticketId: 12,
        content: "New public comment from test.",
        author: { id: 2, name: "Alice Support", role: "IT_STAFF" },
        createdAt: "2026-09-17T10:30:00.000Z",
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type a public message visible to the requester/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type a public message visible to the requester/i);
      fireEvent.change(input, { target: { value: "New public comment from test." } });

      const submitBtn = screen.getByTestId("add-comment-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(postCommentSpy).toHaveBeenCalledWith(12, "New public comment from test.");
      });
    });

    it("submitting an internal note invokes createInternalNote (UI-06, AC-17)", async () => {
      const ticket = makeTicket();
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(ticket);
      const postNoteSpy = vi.spyOn(api, "createInternalNote").mockResolvedValue({
        id: 2,
        ticketId: 12,
        content: "Private escalation detail.",
        author: { id: 2, name: "Alice Support", role: "IT_STAFF" },
        createdAt: "2026-09-17T10:35:00.000Z",
      });

      renderStaffTicketDetail(ticket);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Record private operational notes/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Record private operational notes/i);
      fireEvent.change(input, { target: { value: "Private escalation detail." } });

      const submitBtn = screen.getByTestId("add-note-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(postNoteSpy).toHaveBeenCalledWith(12, "Private escalation detail.");
      });
    });
  });
});
