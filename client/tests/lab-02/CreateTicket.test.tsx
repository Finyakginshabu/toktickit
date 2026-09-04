import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

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
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockRelatedSystems = [
  { id: 1, name: "Email" },
  { id: 7, name: "Corporate Laptop" },
];

describe("Lab 2 Create Ticket Suite (client/tests/lab-02/CreateTicket.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(mockRelatedSystems);
  });

  // UI-01: Development Requester selector on initial load
  it("renders Development Requester selector on initial load with active users (UI-01, AC-07, AC-08)", async () => {
    render(<App />);

    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab 2 Development Mode:/i)).toBeInTheDocument();

    const dropdown = await screen.findByRole("combobox");
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson \(Computer Engineering\)/i)).toBeInTheDocument();
    expect(screen.getByText(/David Lee \(Information Technology\)/i)).toBeInTheDocument();
  });

  // UI-02: Select user & persist in localStorage
  it("selecting a requester updates header and stores in localStorage (UI-02, AC-09)", async () => {
    render(<App />);

    const dropdown = await screen.findByRole("combobox");
    fireEvent.change(dropdown, { target: { value: "2" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("David Lee").length).toBeGreaterThan(0);
    expect(screen.getByText("Information Technology")).toBeInTheDocument();
    expect(localStorage.getItem("toktickit_dev_requester_id")).toBe("2");
  });

  // Helper to open Create Ticket tab with active user selected
  async function setupCreateTicketView() {
    localStorage.setItem("toktickit_dev_requester_id", "1");
    render(<App />);

    // Wait for header to display Jennifer
    await waitFor(() => {
      expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThan(0);
    });

    // Click "Create Ticket" navigation tab
    const createTab = screen.getByRole("button", { name: /Create Ticket/i });
    fireEvent.click(createTab);

    // Wait for form to load
    expect(await screen.findByLabelText(/Summary \/ Short Title/i)).toBeInTheDocument();
  }

  // UI-03: Form validation on empty submit
  it("displays inline field-level error messages on empty/short submission (UI-03, AC-02, BR-06)", async () => {
    await setupCreateTicketView();

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Ticket summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Detailed description is required/i)).toBeInTheDocument();
  });

  // UI-04: File dropzone rejects file > 5 MB
  it("rejects attachments exceeding 5 MB limit with immediate validation message (UI-04, AC-04, BR-09)", async () => {
    await setupCreateTicketView();

    // Create 6 MB dummy file
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "oversized.pdf", {
      type: "application/pdf",
    });

    const fileInput = document.getElementById("ticket-file-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(await screen.findByText(/exceeds the 5 MB limit/i)).toBeInTheDocument();
  });

  // UI-04-B: Drag-and-drop file attachment
  it("accepts valid file attachments dropped directly into the dropzone (UI-04, AC-03)", async () => {
    await setupCreateTicketView();

    const validFile = new File(["dummy pdf content"], "network_diagnostic.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText(/Drag and drop files here/i).closest("div")!;
    
    // Simulate drag over and drop
    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [validFile],
      },
    });

    expect(await screen.findByText("network_diagnostic.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Selected Files \(1\/5\)/i)).toBeInTheDocument();
  });

  // UI-05: Submit button busy state
  it("displays busy loading state on submit button during submission (UI-05, AC-05, BR-08)", async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.spyOn(api, "createTicket").mockReturnValue(pendingPromise as any);

    await setupCreateTicketView();

    // Fill valid form
    const summaryInput = screen.getByLabelText(/Summary \/ Short Title/i);
    const descInput = screen.getByLabelText(/Detailed Description/i);

    fireEvent.change(summaryInput, { target: { value: "Valid Summary for Ticket" } });
    fireEvent.change(descInput, { target: { value: "Valid description longer than 10 chars" } });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify button shows busy state and is disabled while promise is pending
    const busyButton = screen.getByRole("button", { name: /Submitting/i });
    expect(busyButton).toBeInTheDocument();
    expect(busyButton).toBeDisabled();

    // Now resolve the promise
    await act(async () => {
      resolvePromise!({
        id: 101,
        ticketNumber: "TKT-2026-000101",
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Valid Summary for Ticket",
        description: "Valid description longer than 10 chars",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: [],
      });
    });

    // Success view appears
    expect(await screen.findByText(/Ticket Submitted Successfully!/i)).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
  });

  // UI-06: Error banner displayed and form values preserved on failure
  it("displays error banner and preserves form values on API error (UI-06, AC-06, BR-07)", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new Error("Unable to connect to TokTickIT API")
    );

    await setupCreateTicketView();

    const summaryInput = screen.getByLabelText(/Summary \/ Short Title/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Detailed Description/i) as HTMLTextAreaElement;

    fireEvent.change(summaryInput, { target: { value: "Preserved Summary Content" } });
    fireEvent.change(descInput, { target: { value: "Preserved detailed description text" } });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Error banner appears
    expect(await screen.findByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();

    // Form values are preserved
    expect(summaryInput.value).toBe("Preserved Summary Content");
    expect(descInput.value).toBe("Preserved detailed description text");
  });
});
