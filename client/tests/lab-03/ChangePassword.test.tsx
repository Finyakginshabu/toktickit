import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

function renderChangePassword() {
  return render(
    <AuthProvider>
      <ChangePassword />
    </AuthProvider>
  );
}

describe("ChangePassword UI Component (UI-02, AC-02, BR-02, BR-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_auth_token", "test-token");
    localStorage.setItem(
      "toktickit_auth_user",
      JSON.stringify({
        id: 11,
        name: "New Employee",
        email: "firstlogin@toktickit.local",
        role: "REQUESTER",
        mustChangePassword: true,
      })
    );
    vi.restoreAllMocks();
  });

  it("renders ChangePassword screen with complexity rules checklist and disabled submit button", () => {
    renderChangePassword();

    expect(screen.getByText(/Password Change Required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    expect(submitBtn).toBeDisabled();

    // Check checklist items are rendered
    expect(screen.getByText(/At least 8 characters in length/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one uppercase letter \(A-Z\)/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one lowercase letter \(a-z\)/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one number or special character/i)).toBeInTheDocument();
    expect(screen.getByText(/Different from current password/i)).toBeInTheDocument();
    expect(screen.getByText(/New password and confirmation match/i)).toBeInTheDocument();
  });

  it("enables submit button only when all complexity rules are satisfied", () => {
    renderChangePassword();

    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);
    const submitBtn = screen.getByRole("button", { name: /Update Password/i });

    // Step 1: Type current password
    fireEvent.change(currentInput, { target: { value: "InitialPassword123!" } });
    expect(submitBtn).toBeDisabled();

    // Step 2: Type partial new password (fails length, number, match)
    fireEvent.change(newInput, { target: { value: "Abc" } });
    expect(submitBtn).toBeDisabled();

    // Step 3: Type same as current password (fails different)
    fireEvent.change(newInput, { target: { value: "InitialPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "InitialPassword123!" } });
    expect(submitBtn).toBeDisabled();

    // Step 4: Type valid new password meeting all criteria
    fireEvent.change(newInput, { target: { value: "BrandNewPass2026!" } });
    fireEvent.change(confirmInput, { target: { value: "BrandNewPass2026!" } });

    // Button should now be enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it("submits password change request when form is valid (AC-06)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Password changed successfully",
        mustChangePassword: false,
      }),
    } as Response);

    renderChangePassword();

    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: "InitialPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: "BrandNewPass2026!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "BrandNewPass2026!" },
    });

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            currentPassword: "InitialPassword123!",
            newPassword: "BrandNewPass2026!",
          }),
        })
      );
    });
  });
});
