import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        department: "Computer Engineering",
      },
    ]);
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", async () => {
    render(<App />);
    expect(await screen.findByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(button);

    expect(await screen.findByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(button);

    expect(await screen.findByText(/Offline/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Unable to connect to TokTickIT API/i)[0]
    ).toBeInTheDocument();
  });
});
