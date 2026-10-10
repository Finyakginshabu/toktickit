import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ActionsTakenSection from "../../src/components/ActionsTakenSection.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { ActionTaken, User } from "../../src/types/index.js";

const mockStaffUser: User = {
  id: 2,
  name: "Alice Support",
  email: "staff.alice@toktickit.local",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const mockActions: ActionTaken[] = [
  {
    id: 101,
    ticketId: 12,
    performedById: 2,
    actionDateTime: "2026-09-17T10:05:00.000Z",
    actionDescription: "Inspected paper path and cleared jammed fragments.",
    result: "Printer test page fed cleanly without jamming.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "See test_page.png",
    version: 1,
    createdAt: "2026-09-17T10:05:00.000Z",
    updatedAt: "2026-09-17T10:05:00.000Z",
    performedBy: {
      id: 2,
      name: "Alice Support",
      role: "IT_STAFF",
      email: "staff.alice@toktickit.local",
    },
  },
  {
    id: 102,
    ticketId: 12,
    performedById: 2,
    actionDateTime: "2026-09-17T11:30:00.000Z",
    actionDescription: "Re-calibrated transmission power on 4th floor access point.",
    result: "Signal strength improved to -58 dBm.",
    followUpRequired: true,
    followUpNote: "Verify with user on Friday if authentication loop recurs.",
    attachmentNotes: "AP-4B diagnostic report generated.",
    version: 1,
    createdAt: "2026-09-17T11:30:00.000Z",
    updatedAt: "2026-09-17T11:30:00.000Z",
    performedBy: {
      id: 2,
      name: "Alice Support",
      role: "IT_STAFF",
    },
  },
];

async function renderActionsSection(props: {
  ticketId?: number;
  ticketStatus?: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "CANCELLED" | "REOPENED";
  isRequester?: boolean;
} = {}) {
  localStorage.setItem("toktickit_auth_token", "mock-token");
  localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));

  await act(async () => {
    render(
      <AuthProvider>
        <ActionsTakenSection
          ticketId={props.ticketId ?? 12}
          ticketStatus={props.ticketStatus ?? "OPEN"}
          isRequester={props.isRequester ?? false}
        />
      </AuthProvider>
    );
  });
}

describe("Lab 4 Actions Taken UI Component Suite (Issue 15)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // UI-01: Table Rendering, 4 States, & Add Modal
  // =========================================================================
  describe("UI-01: 4-State Rendering & Table Presentation", () => {
    it("renders populated table with all spec columns (UI-01, AC-01)", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });
      expect(screen.getByRole("heading", { name: /Actions Taken/i })).toBeInTheDocument();
      expect(screen.queryByTestId("actions-count-badge")).not.toBeInTheDocument();

      // Headers check
      expect(screen.getByText("Date/Time")).toBeInTheDocument();
      expect(screen.getByText("Action Description")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByText("Performed By")).toBeInTheDocument();
      expect(screen.getByText("Follow-Up")).toBeInTheDocument();
      expect(screen.getByText("Attachment Notes")).toBeInTheDocument();
      expect(screen.queryByText("Actions")).not.toBeInTheDocument();

      // Row 1 content check via testid
      const row1 = screen.getByTestId("action-row-101");
      expect(within(row1).getByText("Inspected paper path and cleared jammed fragments.")).toBeInTheDocument();
      expect(within(row1).getByText("Printer test page fed cleanly without jamming.")).toBeInTheDocument();
      expect(within(row1).getByText("Alice Support")).toHaveClass("badge", "bg-light", "text-dark", "border");

      // Mobile card 1 content check
      const card1 = screen.getByTestId("action-card-101");
      expect(within(card1).getByText("Inspected paper path and cleared jammed fragments.")).toBeInTheDocument();

      // Row 2 content check
      const row2 = screen.getByTestId("action-row-102");
      expect(within(row2).getByText("Re-calibrated transmission power on 4th floor access point.")).toBeInTheDocument();
      expect(within(row2).getByText("Verify with user on Friday if authentication loop recurs.")).toBeInTheDocument();
      expect(within(row2).queryByText("Need Follow-Up")).not.toBeInTheDocument();
    });

    it("renders loading skeleton placeholder while data is being fetched (UI-01)", async () => {
      let resolvePromise: (value: ActionTaken[]) => void;
      const promise = new Promise<ActionTaken[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.spyOn(api, "getTicketActions").mockReturnValue(promise);

      // Do NOT await here — we need to observe the loading state before resolution
      localStorage.setItem("toktickit_auth_token", "mock-token");
      localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
      render(
        <AuthProvider>
          <ActionsTakenSection ticketId={12} ticketStatus="OPEN" isRequester={false} />
        </AuthProvider>
      );

      expect(screen.getByTestId("actions-loading-skeleton")).toBeInTheDocument();

      await act(async () => {
        resolvePromise!(mockActions);
      });

      await waitFor(() => {
        expect(screen.queryByTestId("actions-loading-skeleton")).not.toBeInTheDocument();
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });
    });

    it("renders empty state when ticket has zero actions taken (UI-01)", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("actions-empty-state")).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /No actions taken recorded yet for this ticket\. Use the button above to record technical diagnostics or actions\./i
        )
      ).toBeInTheDocument();
    });

    it("renders safe failure banner on network error and allows retry (UI-01)", async () => {
      vi.spyOn(api, "getTicketActions")
        .mockRejectedValueOnce(new Error("Network connection dropped"))
        .mockResolvedValueOnce(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByText(/Network connection dropped/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });
    });

    it("opens Add Action modal with auto-populated read-only performer (UI-01, AC-01)", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add action taken/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add action taken/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /add action taken/i })).toBeInTheDocument();

      // Read-only Performed By field
      const performerInput = screen.getByLabelText(/performed by authenticated staff member/i);
      expect(performerInput).toHaveValue("Alice Support");
      expect(performerInput).toHaveAttribute("readonly");
    });
  });

  // =========================================================================
  // UI-02: Row Click Opens Edit Modal
  // =========================================================================
  describe("UI-02: Row Click Editing", () => {
    it("opens the edit modal from a row without rendering action controls", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });

      const row = screen.getByTestId("action-row-101");
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
      fireEvent.click(row);

      expect(screen.getByRole("heading", { name: /edit action taken/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^status/i)).not.toBeInTheDocument();
    });

    it("opens the edit modal when a mobile action card is clicked", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("action-card-101")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("action-card-101"));

      expect(screen.getByRole("heading", { name: /edit action taken/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // UI-03: Follow-Up Checkbox, Flag, and Note
  // =========================================================================
  describe("UI-03: Follow-Up Management (AC-03, BR-06)", () => {
    it("checkbox dynamically toggles required follow-up note input", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add action taken/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add action taken/i }));

      const followUpSwitch = screen.getByRole("switch", { name: /follow-up required\?/i });
      expect(followUpSwitch).not.toBeChecked();
      expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();

      // Check the switch
      fireEvent.click(followUpSwitch);
      expect(followUpSwitch).toBeChecked();

      const noteInput = screen.getByLabelText(/follow-up note/i);
      expect(noteInput).toBeInTheDocument();
      expect(noteInput).toBeRequired();
    });

    it("shows the follow-up note without a status flag or resolved state", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("action-row-102")).toBeInTheDocument();
      });

      const row2 = screen.getByTestId("action-row-102");
      expect(within(row2).getByText(/Verify with user on Friday/i)).toBeInTheDocument();
      expect(within(row2).queryByText(/Need Follow-Up|Follow-Up Resolved/i)).not.toBeInTheDocument();
      expect(within(row2).queryByRole("button", { name: /Mark Resolved/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // UI-04: Requester Read-Only View
  // =========================================================================
  describe("UI-04: Requester View-Only Presentation (AC-04, AC-05)", () => {
    it("omits write controls and row editing while hiding staff email addresses", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection({ isRequester: true });

      await waitFor(() => {
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });

      // Controls must be completely absent
      expect(screen.queryByRole("button", { name: /add action taken/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();

      // Staff names are shown, but emails are hidden
      const row1 = screen.getByTestId("action-row-101");
      expect(within(row1).getByText("Alice Support")).toBeInTheDocument();
      expect(screen.queryByText(/staff\.alice@toktickit\.local/i)).not.toBeInTheDocument();
      fireEvent.click(row1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // UI-13: Form Data Retention on Recoverable Error
  // =========================================================================
  describe("UI-13: Form Data Retention (FR-19)", () => {
    it("preserves entered inputs across recoverable server errors", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
      vi.spyOn(api, "createTicketAction").mockRejectedValue(new Error("Database connection busy"));

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add action taken/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add action taken/i }));

      // Fill out form
      const descInput = screen.getByLabelText(/action description/i);
      const resultInput = screen.getByLabelText(/result/i);

      fireEvent.change(descInput, { target: { value: "Replaced faulty optical sensor on tray 2." } });
      fireEvent.change(resultInput, { target: { value: "Paper feeds without error code 103." } });

      const submitBtn = screen.getByRole("button", { name: /save action/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Database connection busy/i)).toBeInTheDocument();
      });

      // Modal remains open and values are retained
      expect(descInput).toHaveValue("Replaced faulty optical sensor on tray 2.");
      expect(resultInput).toHaveValue("Paper feeds without error code 103.");
    });
  });

  // =========================================================================
  // AC-18: Double-Click Prevention and In-Flight Busy State
  // =========================================================================
  describe("AC-18: Double-Click Prevention & In-Flight State (FR-19)", () => {
    it("submit button disables and displays spinner during request", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
      let resolveCreation: (value: ActionTaken) => void;
      const pendingPromise = new Promise<ActionTaken>((res) => {
        resolveCreation = res;
      });
      vi.spyOn(api, "createTicketAction").mockReturnValue(pendingPromise);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add action taken/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add action taken/i }));

      fireEvent.change(screen.getByLabelText(/action description/i), {
        target: { value: "Re-installed NIC driver package." },
      });
      fireEvent.change(screen.getByLabelText(/result/i), {
        target: { value: "Link negotiation succeeded at 1 Gbps." },
      });

      const submitBtn = screen.getByRole("button", { name: /save action/i });
      fireEvent.click(submitBtn);

      // Button should be disabled with spinner
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();

      resolveCreation!({
        id: 103,
        ticketId: 12,
        performedById: 2,
        actionDateTime: "2026-09-17T12:00:00.000Z",
        actionDescription: "Re-installed NIC driver package.",
        result: "Link negotiation succeeded at 1 Gbps.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        version: 1,
        createdAt: "2026-09-17T12:00:00.000Z",
        updatedAt: "2026-09-17T12:00:00.000Z",
      });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Ticket Locked State (Terminal Closed or Cancelled)
  // =========================================================================
  describe("Locked Terminal Ticket (BR-16, FR-09, AC-17)", () => {
    it("disables adding and row editing when ticket is CLOSED", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection({ ticketStatus: "CLOSED" });

      await waitFor(() => {
        expect(screen.getByTestId("action-row-101")).toBeInTheDocument();
      });

      const addBtn = screen.getByRole("button", { name: /add action taken/i });
      expect(addBtn).toBeDisabled();

      const row = screen.getByTestId("action-row-101");
      fireEvent.click(row);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Accessibility & Keyboard Navigation (A11Y-01)
  // =========================================================================
  describe("Accessibility & Keyboard Navigation (A11Y-01)", () => {
    it("dismisses modal on Escape key press", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add action taken/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add action taken/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows the follow-up note without a flag control", async () => {
      vi.spyOn(api, "getTicketActions").mockResolvedValue(mockActions);

      await renderActionsSection();

      await waitFor(() => {
        expect(screen.getByTestId("action-row-102")).toBeInTheDocument();
      });

      const row2 = screen.getByTestId("action-row-102");
      expect(within(row2).getByText(/Verify with user on Friday/i)).toBeInTheDocument();
      expect(within(row2).queryByText("Need Follow-Up")).not.toBeInTheDocument();
    });
  });
});
