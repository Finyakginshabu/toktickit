import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentSection from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";
import { Attachment } from "../../src/types/index.js";

const mockAttachments: Attachment[] = [
  {
    id: 1,
    ticketId: 10,
    originalName: "active_spec.pdf",
    fileSize: 1024 * 500, // 500 KB
    mimeType: "application/pdf",
    isRemoved: false,
    uploadedAt: "2026-09-03T10:00:00.000Z",
  },
  {
    id: 2,
    ticketId: 10,
    originalName: "old_screenshot.png",
    fileSize: 1024 * 1024 * 1.5, // 1.5 MB
    mimeType: "image/png",
    isRemoved: true,
    removedReason: "Outdated screenshot replaced by current diagnostic",
    removedAt: "2026-09-03T11:30:00.000Z",
    uploadedAt: "2026-09-03T09:00:00.000Z",
  },
];

describe("Lab 2 Attachment Section Suite (client/tests/lab-02/AttachmentSection.test.tsx)", () => {
  const onAttachmentChanged = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onAttachmentChanged.mockClear();
  });

  // UI-09a: Renders active and soft-removed attachments
  it("renders active and soft-removed attachments with icons, sizes, badges, and reasons (UI-09, AC-17, AC-18)", () => {
    render(
      <AttachmentSection
        ticketId={10}
        requesterId={1}
        attachments={mockAttachments}
        onAttachmentChanged={onAttachmentChanged}
      />
    );

    // Active item checks
    expect(screen.getByText("active_spec.pdf")).toBeInTheDocument();
    expect(screen.getByText("500.0 KB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download active_spec\.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove active_spec\.pdf/i })).toBeInTheDocument();

    // Soft-removed item checks
    expect(screen.getByText("old_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(
      screen.getByText(/Reason: Outdated screenshot replaced by current diagnostic/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download disabled for old_screenshot\.png/i })
    ).toBeDisabled();
  });

  // UI-09b: Add attachment via file upload
  it("allows uploading a new attachment when under the 5-cap limit (UI-09, AC-15, FR-14)", async () => {
    const addSpy = vi.spyOn(api, "addAttachment").mockResolvedValue({
      id: 3,
      ticketId: 10,
      originalName: "new_diagnostic.txt",
      fileSize: 2048,
      mimeType: "text/plain",
      isRemoved: false,
      uploadedAt: new Date().toISOString(),
    });

    render(
      <AttachmentSection
        ticketId={10}
        requesterId={1}
        attachments={mockAttachments}
        onAttachmentChanged={onAttachmentChanged}
      />
    );

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const testFile = new File(["test diagnostic content"], "diagnostic.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(10, 1, testFile);
      expect(onAttachmentChanged).toHaveBeenCalled();
    });
  });

  // UI-09c: Enforces 5 active attachments cap
  it("disables upload and displays limit warning when 5 active attachments exist (UI-09, AC-16, BR-10)", () => {
    const fiveActiveAttachments: Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: 10,
      originalName: `file_${i + 1}.png`,
      fileSize: 1024,
      mimeType: "image/png",
      isRemoved: false,
      uploadedAt: "2026-09-03T10:00:00.000Z",
    }));

    render(
      <AttachmentSection
        ticketId={10}
        requesterId={1}
        attachments={fiveActiveAttachments}
        onAttachmentChanged={onAttachmentChanged}
      />
    );

    // Active limit warning
    expect(screen.getByText(/Active limit reached/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum 5 active attachments reached/i)).toBeInTheDocument();

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    expect(fileInput.disabled).toBe(true);
  });

  // UI-09d: Soft removal modal workflow with reason validation
  it("opens modal, requires minimum 3 chars reason, and calls softRemoveAttachment (UI-09, AC-17, BR-11)", async () => {
    const removeSpy = vi.spyOn(api, "softRemoveAttachment").mockResolvedValue({
      id: 1,
      ticketId: 10,
      originalName: "active_spec.pdf",
      fileSize: 1024 * 500,
      mimeType: "application/pdf",
      isRemoved: true,
      removedReason: "Duplicate file uploaded by mistake",
      removedAt: new Date().toISOString(),
      uploadedAt: "2026-09-03T10:00:00.000Z",
    });

    render(
      <AttachmentSection
        ticketId={10}
        requesterId={1}
        attachments={mockAttachments}
        onAttachmentChanged={onAttachmentChanged}
      />
    );

    // Click remove on active file
    const removeBtn = screen.getByRole("button", { name: /Remove active_spec\.pdf/i });
    fireEvent.click(removeBtn);

    // Modal dialog appears
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const reasonTextarea = screen.getByLabelText(/Removal Reason/i);
    const confirmBtn = screen.getByRole("button", { name: /Confirm Removal/i });

    // Initially disabled (0 chars)
    expect(confirmBtn).toBeDisabled();

    // Type 2 chars (still disabled)
    fireEvent.change(reasonTextarea, { target: { value: "no" } });
    expect(confirmBtn).toBeDisabled();

    // Type valid reason (>= 3 chars)
    fireEvent.change(reasonTextarea, {
      target: { value: "Duplicate file uploaded by mistake" },
    });
    expect(confirmBtn).not.toBeDisabled();

    // Click confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(1, 1, "Duplicate file uploaded by mistake");
      expect(onAttachmentChanged).toHaveBeenCalled();
    });

    // Modal should close
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
