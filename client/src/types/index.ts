export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  department?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetAdminUsersParams {
  search?: string;
  role?: Role | "";
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  initialPassword: string;
  department?: string;
}

export interface UpdateAdminUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  department?: string;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  isActive?: boolean;
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
  | "CANCELLED";

export interface ResolutionGateErrorDetail {
  code: "NO_ACTIONS_TAKEN" | "MISSING_RESOLUTION_SUMMARY";
  field?: string;
  message: string;
}

export interface ConflictErrorPayload {
  version: number;
  currentStatus: TicketStatus;
  updatedAt: string;
}

export type AppTab =
  | "my-tickets"
  | "ticket-queue"
  | "create-ticket"
  | "ticket-detail"
  | "user-management"
  | "dashboard";

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
  status?: TicketStatus | string;
  itPriority?: Priority | string;
  ownerId?: number | "unassigned" | "me" | "";
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
  resolvedAt?: string | null;
  version?: number;
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
  actionsTaken?: ActionTaken[];
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

export interface ActionTaken {
  id: number;
  ticketId: number;
  performedById: number;
  actionDateTime: string;
  actionDescription: string;
  result?: string | null;
  followUpRequired: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  clientActionId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  performedBy?: {
    id: number;
    name: string;
    role: Role;
    email?: string;
  };
}

export interface CreateActionTakenPayload {
  actionDescription: string;
  result?: string | null;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  actionDateTime?: string;
  clientActionId?: string;
}

export interface UpdateActionTakenPayload {
  expectedVersion: number;
  actionDescription?: string;
  result?: string | null;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

// ---------------------------------------------------------------------------
// Lab 4 — Dashboard Types (FR-14, FR-15, FR-16, BR-12, BR-13, BR-14, BR-15)
// ---------------------------------------------------------------------------

export interface RequesterDashboardMetrics {
  myOpenTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  waitingForRequesterTickets: number;
}

export interface RequesterDrillDownUrls {
  myOpenTickets: string;
  inProgressTickets: string;
  resolvedTickets: string;
  closedTickets: string;
  waitingForRequesterTickets: string;
}

export interface RecentTicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  requestedPriority?: Priority;
  itPriority?: Priority;
  requesterName?: string;
  ticketOwnerName?: string | null;
  updatedAt: string;
  categoryName: string;
}

export interface RequesterDashboardResponse {
  metrics: RequesterDashboardMetrics;
  drillDownUrls: RequesterDrillDownUrls;
  recentTickets: RecentTicketSummary[];
}

export interface StaffDashboardMetrics {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForRequesterTickets: number;
  myAssignedTickets: number;
  unassignedTickets: number;
  highUrgentTickets: number;
  myOpenActionsCount: number;
}

export interface StaffMetricDeltas {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForRequesterTickets: number;
  myAssignedTickets: number;
}

export interface StaffDrillDownUrls {
  newTickets: string;
  openTickets: string;
  inProgressTickets: string;
  waitingForRequesterTickets: string;
  myAssignedTickets: string;
  unassignedTickets: string;
  highUrgentTickets: string;
}

export interface StaffDashboardResponse {
  metrics: StaffDashboardMetrics;
  deltas: StaffMetricDeltas;
  drillDownUrls: StaffDrillDownUrls;
  recentTickets: RecentTicketSummary[];
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    REQUESTER: number;
    IT_STAFF: number;
    ADMINISTRATOR: number;
  };
}

export interface AdminDashboardResponse extends StaffDashboardResponse {
  ticketMetrics: StaffDashboardMetrics;
  userMetrics: UserMetrics;
  drillDownUrls: StaffDrillDownUrls & { manageUsers: string };
}
