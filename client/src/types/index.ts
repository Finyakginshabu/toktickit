export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  department?: string | null;
  isActive?: boolean;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department?: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED"
  | "PENDING";

export type AppTab =
  | "my-tickets"
  | "ticket-queue"
  | "create-ticket"
  | "ticket-detail"
  | "user-management";

export interface GetTicketsParams {
  requesterId: number;
  search?: string;
  categoryId?: number;
  priority?: Priority;
  status?: TicketStatus;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetStaffTicketsParams {
  search?: string;
  categoryId?: number;
  status?: TicketStatus;
  itPriority?: Priority;
  ownerId?: number | "unassigned" | "";
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "itPriority" | "currentStatus" | "ticketNumber";
  sortOrder?: "asc" | "desc";
}

export interface Attachment {
  id: number;
  ticketId?: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedReason?: string | null;
  removedAt?: string | null;
  uploadedAt: string;
}

export interface PublicComment {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: Role;
  };
  createdAt: string;
}

export interface InternalNote {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: Role;
  };
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwnerId?: number | null;
  resolutionSummary?: string | null;
  problemAppearsResolved?: boolean;
  problemAppearsResolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: RequesterUser | User;
  ticketOwner?: User | null;
  category?: Category;
  relatedSystem?: RelatedSystem;
  attachments?: Attachment[];
  attachmentCount?: number;
  publicComments?: PublicComment[];
  internalNotes?: InternalNote[];
}

export interface PaginatedTicketsResponse {
  data: Ticket[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
