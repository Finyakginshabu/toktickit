import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("Lab 2 Development Requester Context & UI Shell", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders Development Requester selector on initial load with active users (UI-01, AC-07, AC-08)", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    // Check modal title and notice
    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab 2 Development Mode:/i)).toBeInTheDocument();

    // Check active requesters appear in dropdown
    const dropdown = await screen.findByRole("combobox");
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson \(Computer Engineering\)/i)).toBeInTheDocument();
    expect(screen.getByText(/David Lee \(Information Technology\)/i)).toBeInTheDocument();
  });

  it("selecting a requester updates header and stores in localStorage (UI-02, AC-09)", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    // Wait for dropdown
    const dropdown = await screen.findByRole("combobox");
    fireEvent.change(dropdown, { target: { value: "2" } });

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
    });

    // Header displays David Lee
    expect(screen.getAllByText("David Lee").length).toBeGreaterThan(0);
    expect(screen.getByText("Information Technology")).toBeInTheDocument();

    // Verify localStorage persistence
    expect(localStorage.getItem("toktickit_dev_requester_id")).toBe("2");
  });

  it("clicking 'Change Requester' re-opens the selection modal", async () => {
    localStorage.setItem("toktickit_dev_requester_id", "1");
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    // Header already has Jennifer
    await waitFor(() => {
      expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();

    // Click Change Requester
    const changeBtn = screen.getByRole("button", { name: /Change Requester/i });
    fireEvent.click(changeBtn);

    // Modal is visible again
    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
  });
});
