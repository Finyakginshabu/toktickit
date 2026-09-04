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
export type TicketStatus = "NEW" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";

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
  createdAt: string;
  updatedAt: string;
  requester?: RequesterUser;
  category?: Category;
  relatedSystem?: RelatedSystem;
  attachments?: Attachment[];
  attachmentCount?: number;
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
