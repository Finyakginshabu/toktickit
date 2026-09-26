import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login } from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

function renderLogin() {
  return render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

describe("Login UI Component (UI-01, AC-01, AC-05)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders login form with brand header, email and password fields, and sign in button", () => {
    renderLogin();

    expect(screen.getByText(/Sign in to TokTickIT/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("shows client validation errors when submitting empty form", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid email format", async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it("shows error alert on failed authentication (AC-05)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials or inactive account.",
        },
      }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "wrong@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "WrongPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(
      await screen.findByText(/Invalid credentials or inactive account/i)
    ).toBeInTheDocument();
  });

  it("successfully logs in with valid credentials (AC-01)", async () => {
    const mockUser = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "test-valid-jwt-token",
        user: mockUser,
      }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "jennifer.anderson@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(localStorage.getItem("toktickit_auth_token")).toBe("test-valid-jwt-token");
      expect(localStorage.getItem("toktickit_auth_user")).toContain("Jennifer Anderson");
    });
  });
});
