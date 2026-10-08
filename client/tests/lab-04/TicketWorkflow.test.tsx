import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResolutionGateModal from "../../src/components/ResolutionGateModal.js";
import ConflictModal from "../../src/components/ConflictModal.js";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { Ticket, TicketStatus } from "../../src/types/index.js";

const mockTicket: Ticket = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop power diagnostics",
  description: "Battery draining rapidly during video conferencing.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  version: 2,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
  ticketOwner: { id: 2, name: "Alice Support", email: "staff.alice@toktickit.local", role: "IT_STAFF", mustChangePassword: false },
};

describe("Lab 4 Ticket Workflow & Resolution Gate UI Suite (client/tests/lab-04/TicketWorkflow.test.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // UI-05: Resolution Gate checklist modal rendering (AC-07, AC-08, AC-09)
  // -------------------------------------------------------------------------
  describe("ResolutionGateModal (UI-05, AC-07, AC-08, AC-09)", () => {
    it("renders dynamic checklist showing unmet criteria when ticket has zero actions and no summary", () => {
      render(
        <ResolutionGateModal
          isOpen={true}
          ticket={mockTicket}
          actionsCount={0}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          loading={false}
        />
      );

      // Verify modal header
      expect(screen.getByText("Ticket Resolution Gate")).toBeInTheDocument();

      // Item 1: Actions check should be blocked
      const actionItem = screen.getByTestId("gate-checklist-actions");
      expect(actionItem).toHaveTextContent("Action Taken Required");

      // Item 2: Summary check should be blocked
      const summaryItem = screen.getByTestId("gate-checklist-summary");
      expect(summaryItem).toHaveTextContent("Resolution Summary Required");

      // Submit button must be disabled with tooltip
      const confirmBtn = screen.getByTestId("confirm-resolution-btn");
      expect(confirmBtn).toBeDisabled();
      const tooltipWrapper = confirmBtn.closest("span");
      expect(tooltipWrapper).toHaveAttribute(
        "title",
        "All checklist requirements must be met before confirming resolution."
      );
    });

    it("satisfies actions item when actionsCount >= 1 and enables confirm button once summary is >= 5 chars", () => {
      render(
        <ResolutionGateModal
          isOpen={true}
          ticket={mockTicket}
          actionsCount={2}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          loading={false}
        />
      );

      // Actions item should be green / satisfied
      const actionItem = screen.getByTestId("gate-checklist-actions");
      expect(actionItem).toHaveTextContent("Actions Recorded: Ticket has 2 Action Taken line item(s)");

      // Initially summary is empty -> button is disabled
      const confirmBtn = screen.getByTestId("confirm-resolution-btn");
      expect(confirmBtn).toBeDisabled();

      // Enter 4 chars (too short)
      const input = screen.getByTestId("resolution-summary-input");
      fireEvent.change(input, { target: { value: "Done" } });
      expect(confirmBtn).toBeDisabled();

      // Enter 5+ chars -> button becomes enabled
      fireEvent.change(input, { target: { value: "Replaced battery cell and verified voltage." } });
      expect(confirmBtn).not.toBeDisabled();
      expect(screen.getByTestId("gate-checklist-summary")).toHaveTextContent("Summary meets minimum requirement");
    });
  });

  // -------------------------------------------------------------------------
  // UI-06: Successful resolution flow with summary input (AC-10, FR-10)
  // -------------------------------------------------------------------------
  describe("Resolution Submission Flow (UI-06, AC-10, FR-10)", () => {
    it("calls onConfirm with trimmed summary and ticket version", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <ResolutionGateModal
          isOpen={true}
          ticket={mockTicket}
          actionsCount={1}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          loading={false}
        />
      );

      const input = screen.getByTestId("resolution-summary-input");
      fireEvent.change(input, { target: { value: "  Cleaned fan ducts and verified cooling.  " } });

      const confirmBtn = screen.getByTestId("confirm-resolution-btn");
      fireEvent.click(confirmBtn);

      expect(onConfirm).toHaveBeenCalledWith(
        "Cleaned fan ducts and verified cooling.",
        mockTicket.version
      );
    });
  });

  // -------------------------------------------------------------------------
  // UI-12: Double-click prevention and in-flight busy state (FR-19, AC-18)
  // -------------------------------------------------------------------------
  describe("Double-Click Prevention (UI-12, FR-19, AC-18)", () => {
    it("disables confirm button and renders busy spinner while loading", () => {
      render(
        <ResolutionGateModal
          isOpen={true}
          ticket={mockTicket}
          actionsCount={1}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          loading={true}
        />
      );

      const confirmBtn = screen.getByTestId("confirm-resolution-btn");
      expect(confirmBtn).toBeDisabled();
      expect(screen.getByText("Resolving...")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // UI-07: Optimistic Concurrency Conflict Modal (AC-12, BR-11, FR-19)
  // -------------------------------------------------------------------------
  describe("ConflictModal (UI-07, AC-12, BR-11, FR-19)", () => {
    it("displays conflict message, latest server record, and action buttons", () => {
      const onReload = vi.fn();
      const onKeepInput = vi.fn();

      render(
        <ConflictModal
          isOpen={true}
          conflictData={{
            version: 4,
            currentStatus: "RESOLVED",
            updatedAt: "2026-10-01T12:00:00.000Z",
          }}
          onReload={onReload}
          onKeepInput={onKeepInput}
        />
      );

      expect(screen.getByText("Workflow Update Conflict")).toBeInTheDocument();
      expect(
        screen.getByText(/Another staff member updated this ticket while you were working/i)
      ).toBeInTheDocument();

      // Shows server version details
      const details = screen.getByTestId("conflict-server-details");
      expect(details).toHaveTextContent("v4");
      expect(details).toHaveTextContent("RESOLVED");

      // Test Keep My Input
      fireEvent.click(screen.getByTestId("conflict-keep-input-btn"));
      expect(onKeepInput).toHaveBeenCalledTimes(1);

      // Test Reload Latest
      fireEvent.click(screen.getByTestId("conflict-reload-latest-btn"));
      expect(onReload).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Staff Ticket Detail Resolution Gate & Advisory Integration
  // -------------------------------------------------------------------------
  describe("StaffTicketDetail Workflow Integration", () => {
    it("displays prominent requester advisory notice when problemAppearsResolved is true", async () => {
      const advisoryTicket: Ticket = {
        ...mockTicket,
        problemAppearsResolved: true,
        problemAppearsResolvedAt: "2026-10-01T11:00:00.000Z",
      };

      vi.spyOn(api, "getTicketDetail").mockResolvedValue(advisoryTicket);
      vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
      vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
      vi.spyOn(api, "getActiveStaffUsers").mockResolvedValue([]);
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

      localStorage.setItem("toktickit_auth_token", "mock-staff-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({ id: 2, name: "Alice", email: "staff.alice@toktickit.local", role: "IT_STAFF" })
      );
      window.history.pushState({ tab: "ticket-detail", ticketId: 12 }, "", "/staff/tickets/12");

      render(
        <AuthProvider>
          <RequesterProvider>
            <StaffTicketDetail />
          </RequesterProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        const banner = screen.getByTestId("requester-resolved-advisory");
        expect(banner).toBeInTheDocument();
        expect(banner).toHaveTextContent("Requester Feedback: The requester indicated that the problem appears resolved.");
      });
    });

    it("opens ResolutionGateModal when clicking Move to RESOLVED", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket);
      vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
      vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
      vi.spyOn(api, "getActiveStaffUsers").mockResolvedValue([]);
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

      localStorage.setItem("toktickit_auth_token", "mock-staff-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({ id: 2, name: "Alice", email: "staff.alice@toktickit.local", role: "IT_STAFF" })
      );
      window.history.pushState({ tab: "ticket-detail", ticketId: 12 }, "", "/staff/tickets/12");

      render(
        <AuthProvider>
          <RequesterProvider>
            <StaffTicketDetail />
          </RequesterProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("status-transition-RESOLVED")).toBeInTheDocument();
      });

      // Click "Move to RESOLVED"
      fireEvent.click(screen.getByTestId("status-transition-RESOLVED"));

      // ResolutionGateModal opens
      expect(screen.getByText("Ticket Resolution Gate")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Requester Ticket Detail Cancel & Reopen Controls
  // -------------------------------------------------------------------------
  describe("RequesterTicketDetail Cancel & Reopen Controls", () => {
    it("renders Cancel Ticket button on owned NEW ticket and triggers cancelTicket API", async () => {
      const newTicket: Ticket = {
        ...mockTicket,
        currentStatus: "NEW",
      };

      vi.spyOn(api, "getTicketDetail").mockResolvedValue(newTicket);
      vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
      const cancelSpy = vi.spyOn(api, "cancelTicket").mockResolvedValue({
        id: 12,
        currentStatus: "CANCELLED",
        version: 3,
      });

      localStorage.setItem("toktickit_auth_token", "mock-requester-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 1,
          name: "Jennifer",
          email: "jennifer.anderson@kmutt.ac.th",
          role: "REQUESTER",
          department: "Computer Engineering",
        })
      );
      window.history.pushState({ tab: "ticket-detail", ticketId: 12 }, "", "/tickets/12");

      await act(async () => {
        render(
          <AuthProvider>
            <RequesterProvider>
              <RequesterTicketDetail />
            </RequesterProvider>
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId("cancel-ticket-btn")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("cancel-ticket-btn"));
      });
      expect(cancelSpy).toHaveBeenCalledWith(12, 2);
    });

    it("renders Reopen Ticket button on owned RESOLVED ticket and triggers reopenTicket API", async () => {
      const resolvedTicket: Ticket = {
        ...mockTicket,
        currentStatus: "RESOLVED",
      };

      vi.spyOn(api, "getTicketDetail").mockResolvedValue(resolvedTicket);
      vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
      const reopenSpy = vi.spyOn(api, "reopenTicket").mockResolvedValue({
        id: 12,
        currentStatus: "REOPENED",
        version: 3,
      });

      localStorage.setItem("toktickit_auth_token", "mock-requester-token");
      localStorage.setItem(
        "toktickit_auth_user",
        JSON.stringify({
          id: 1,
          name: "Jennifer",
          email: "jennifer.anderson@kmutt.ac.th",
          role: "REQUESTER",
          department: "Computer Engineering",
        })
      );
      window.history.pushState({ tab: "ticket-detail", ticketId: 12 }, "", "/tickets/12");

      await act(async () => {
        render(
          <AuthProvider>
            <RequesterProvider>
              <RequesterTicketDetail />
            </RequesterProvider>
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId("reopen-ticket-btn")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("reopen-ticket-btn"));
      });
      expect(reopenSpy).toHaveBeenCalledWith(12, 2);
    });
  });
});
