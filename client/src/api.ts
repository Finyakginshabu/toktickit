import {
  RequesterUser,
  Category,
  RelatedSystem,
  Ticket,
  Attachment,
  Priority,
  TicketStatus,
  User,
  PublicComment,
  InternalNote,
} from "./types/index.js";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function getAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("toktickit_auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export * from "./types/index.js";

// Lab 1 System status check
export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!healthRes.ok) {
    throw new Error(`Unable to connect to TokTickIT API (Status: ${healthRes.status})`);
  }

  const categories = await getCategories();
  return { online: true, categories };
}

// Lab 2 Reference Data APIs
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch categories (Status: ${res.status})`);
  }

  return res.json();
}

export async function getRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch development requesters (Status: ${res.status})`);
  }

  return res.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch related systems (Status: ${res.status})`);
  }

  return res.json();
}

// Lab 2 Ticket Creation API
export async function createTicket(formData: FormData): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Server returned status ${res.status}`;
    const error = new Error(message);
    (error as any).details = errorJson?.error?.details;
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

// Lab 2 & 3 Ticket Detail & Attachment Lifecycle APIs
export async function getTicketDetail(ticketId: number, requesterId?: number): Promise<Ticket> {
  const url = requesterId !== undefined
    ? `${API_URL}/api/tickets/${ticketId}?requesterId=${requesterId}`
    : `${API_URL}/api/tickets/${ticketId}`;

  const res = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Server returned status ${res.status}`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

export async function addAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("requesterId", String(requesterId));

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Server returned status ${res.status}`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

export async function softRemoveAttachment(
  attachmentId: number,
  requesterId: number,
  reason: string
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/soft-remove`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ requesterId, reason }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Server returned status ${res.status}`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

// Lab 2 My Tickets API
export async function getTickets(params: import("./types/index.js").GetTicketsParams): Promise<import("./types/index.js").PaginatedTicketsResponse> {
  const query = new URLSearchParams();
  query.set("requesterId", String(params.requesterId));

  if (params.search && params.search.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.categoryId) {
    query.set("categoryId", String(params.categoryId));
  }
  if (params.priority) {
    query.set("priority", params.priority);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch tickets (Status: ${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

// Lab 3 IT Staff Ticket Queue API
export async function getStaffTickets(
  params: import("./types/index.js").GetStaffTicketsParams = {}
): Promise<import("./types/index.js").PaginatedTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search && params.search.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.categoryId) {
    query.set("categoryId", String(params.categoryId));
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.itPriority) {
    query.set("itPriority", params.itPriority);
  }
  if (params.ownerId !== undefined && params.ownerId !== "") {
    query.set("ownerId", String(params.ownerId));
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }

  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch staff tickets (Status: ${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

// Lab 3 Ticket Operational APIs
export async function claimOrAssignTicket(
  ticketId: number,
  ownerId: number
): Promise<{ id: number; ticketOwnerId: number; currentStatus: TicketStatus }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ownerId }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to assign ticket owner (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: Priority
): Promise<{ id: number; itPriority: Priority; requestedPriority: Priority }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ itPriority }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to update ticket priority (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function updateTicketStatus(
  ticketId: number,
  status: TicketStatus,
  resolutionSummary?: string
): Promise<{ id: number; currentStatus: TicketStatus; resolutionSummary?: string | null }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status, resolutionSummary }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to update ticket status (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function indicateProblemResolved(
  ticketId: number
): Promise<{ id: number; problemAppearsResolved: boolean; problemAppearsResolvedAt: string }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/indicate-resolved`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to mark problem resolved (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

// Lab 3 Discussions Stream APIs
export async function getPublicComments(ticketId: number): Promise<import("./types/index.js").PublicComment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch public comments (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function createPublicComment(
  ticketId: number,
  content: string
): Promise<import("./types/index.js").PublicComment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ content }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to create public comment (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function getInternalNotes(ticketId: number): Promise<import("./types/index.js").InternalNote[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch internal notes (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function createInternalNote(
  ticketId: number,
  content: string
): Promise<import("./types/index.js").InternalNote> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ content }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to create internal note (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function getActiveStaffUsers(): Promise<import("./types/index.js").User[]> {
  const res = await fetch(`${API_URL}/api/staff/users`, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch active staff users (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Administrator User Management APIs
// ---------------------------------------------------------------------------

export async function getAdminUsers(
  params?: import("./types/index.js").GetAdminUsersParams
): Promise<import("./types/index.js").User[]> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set("search", params.search);
  if (params?.role) queryParams.set("role", params.role);

  const queryString = queryParams.toString();
  const url = `${API_URL}/api/admin/users${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to fetch users (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}

export async function createAdminUser(
  data: import("./types/index.js").CreateAdminUserPayload
): Promise<import("./types/index.js").User> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to create user (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).details = errorJson?.error?.details;
    throw error;
  }

  return res.json();
}

export async function updateAdminUser(
  id: number,
  data: import("./types/index.js").UpdateAdminUserPayload
): Promise<import("./types/index.js").User> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to update user (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).details = errorJson?.error?.details;
    throw error;
  }

  return res.json();
}

export async function resetAdminUserPassword(
  id: number,
  initialPassword: string
): Promise<{ message: string; mustChangePassword: boolean }> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ initialPassword }),
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Unable to reset password (Status: ${res.status})`;
    const error = new Error(message);
    (error as any).code = errorJson?.error?.code;
    (error as any).details = errorJson?.error?.details;
    throw error;
  }

  return res.json();
}



