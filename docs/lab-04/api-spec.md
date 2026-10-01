# Lab 4 REST API Specification: Actions Taken, Dashboards & Workflow Gate

## 1. Overview & Protocol Standards

* **Base URL**: `/api`
* **Transport & Security**: HTTP / HTTPS, JSON payload bodies encoded as `application/json; charset=utf-8`.
* **Authentication**: Bearer token authentication header required on all protected endpoints:
  ```http
  Authorization: Bearer <jwt-token>
  ```
  The server derives user identity (`id`, `email`, `role`, `mustChangePassword`, `isActive`) authoritatively from the validated JWT token and verifies active account status in the database for state-changing operations.
* **Standard Error Response Format**:
  ```json
  {
    "error": {
      "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RESOLUTION_GATE_BLOCKED | INVALID_ASSIGNEE | INVALID_TRANSITION | VALIDATION_ERROR | INTERNAL_ERROR",
      "message": "Descriptive error message",
      "details": [
        { "code": "UNRESOLVED_FOLLOW_UP", "actionId": 3, "field": "followUpNote", "message": "Action #3 has pending follow-up that must be resolved." }
      ]
    }
  }
  ```

---

## 2. Actions Taken Endpoints

### 2.1. `GET /api/tickets/:ticketId/actions`
* **Description**: Retrieves all Actions Taken lines for a specific ticket, ordered chronologically by `actionDateTime ASC, id ASC`.
* **Authorization**:
  * `REQUESTER`: Permitted **only** if the ticket was requested by the authenticated user (`ticket.requesterId === req.user.id`).
  * *Privacy boundary*: Attempting to read actions on a ticket belonging to another requester returns `404 Not Found` (to avoid leaking ticket existence).
  * `IT_STAFF`, `ADMINISTRATOR`: Permitted for any accessible ticket.
* **Parameters**:
  * `ticketId` (path parameter, integer, required).
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "ticketId": 12,
      "actionDateTime": "2026-10-01T09:30:00.000Z",
      "actionDescription": "Inspected hardware docking station and replaced faulty USB-C cable.",
      "result": "External monitor now recognizes input signal consistently.",
      "status": "COMPLETED",
      "performedById": 2,
      "performedBy": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      },
      "assigneeId": 3,
      "assignee": {
        "id": 3,
        "name": "Sarah Johnson",
        "role": "IT_STAFF"
      },
      "followUpRequired": true,
      "followUpNote": "Verify with user on Friday if screen flickering recurs.",
      "followUpResolvedAt": "2026-10-01T14:20:00.000Z",
      "attachmentNotes": "Refer to dock_serial_photo.jpg in attachments.",
      "version": 2,
      "createdAt": "2026-10-01T09:35:00.000Z",
      "updatedAt": "2026-10-01T14:20:00.000Z"
    }
  ]
  ```
  *(Note: For Requesters, staff email addresses are omitted to preserve personnel privacy).*
* **Error Responses**:
  * `401 Unauthorized`: Missing or invalid token.
  * `404 Not Found`: Ticket does not exist or belongs to another Requester.

---

### 2.2. `POST /api/tickets/:ticketId/actions`
* **Description**: Records a new Action Taken line under a ticket. The server authoritatively sets `performedById` to the authenticated user ID and bumps the ticket's `updatedAt`.
* **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only. (Requesters receive `403 Forbidden`).
* **Parameters**:
  * `ticketId` (path parameter, integer, required).
* **Request Body**:
  ```json
  {
    "actionDateTime": "2026-10-01T09:30:00.000Z",
    "actionDescription": "Ran hardware diagnostics and memory benchmark.",
    "result": "Memory module passed all tests.",
    "status": "COMPLETED",
    "assigneeId": 3,
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "See test_log.txt",
    "clientActionId": "b18f8e02-4638-4e89-9a74-b5a878508493"
  }
  ```
* **Validation & Business Rules**:
  * The ticket must NOT be in `CLOSED` or `CANCELLED` status (returns `400 Bad Request`).
  * `actionDescription`: Required string, length between 5 and 2000 characters.
  * `status`: Enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`); defaults to `COMPLETED`.
  * `result`: Required ($\ge 3$ characters) if `status === 'COMPLETED'`; optional for `PENDING` or `IN_PROGRESS`.
  * `assigneeId`: Optional integer. If provided, must reference an active user (`isActive = true`) with role `IT_STAFF` or `ADMINISTRATOR`. Inactive users or Requesters are rejected with `400 Bad Request` (`INVALID_ASSIGNEE`).
  * `followUpRequired`: Boolean; defaults to `false`.
  * `followUpNote`: Required if `followUpRequired === true` ($\ge 5$ characters); must be null/empty if `false`.
  * `clientActionId`: Optional UUID for network retry idempotency. If an action with the same `clientActionId` was created in the last 60 seconds, returns the existing record without duplicate insertion.
* **Success Response (`201 Created`)**:
  Returns the created `ActionTaken` object with nested `performedBy` and `assignee` details.
* **Error Responses**:
  * `400 Bad Request`: Validation error, inactive assignee, or ticket is closed/cancelled.
  * `401 Unauthorized`: Unauthenticated.
  * `403 Forbidden`: Requester role.
  * `404 Not Found`: Target ticket does not exist.

---

### 2.3. `PATCH /api/tickets/:ticketId/actions/:actionId`
* **Description**: Updates an existing Action Taken record. Supports updating descriptions, transitioning status, reassigning, and resolving follow-ups.
* **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only.
* **Parameters**:
  * `ticketId` (path parameter, integer, required).
  * `actionId` (path parameter, integer, required).
* **Request Body**:
  ```json
  {
    "actionDescription": "Updated action description...",
    "result": "Diagnostic verified.",
    "status": "COMPLETED",
    "assigneeId": 4,
    "followUpRequired": true,
    "followUpNote": "Check again on Monday",
    "resolveFollowUp": true,
    "expectedVersion": 1
  }
  ```
* **Rules & Optimistic Concurrency**:
  * `expectedVersion`: Required integer. If the record's current `version !== expectedVersion`, the request is rejected with `409 Conflict`.
  * If `resolveFollowUp: true`, sets `followUpResolvedAt = now()`.
  * Rejects updates on tickets that are `CLOSED` or `CANCELLED`.
* **Success Response (`200 OK`)**:
  Returns updated `ActionTaken` object with incremented `version`.
* **Error Responses**:
  * `400 Bad Request`: Validation failure or illegal action status transition.
  * `403 Forbidden`: Unauthorized role.
  * `404 Not Found`: Action or Ticket not found.
  * `409 Conflict`: Concurrent update detected.

---

### 2.4. `POST /api/tickets/:ticketId/actions/:actionId/cancel`
* **Description**: Cancels an Action Taken line. Hard deletion is prohibited to preserve full service-desk auditability.
* **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only.
* **Request Body**:
  ```json
  {
    "reason": "Hardware replacement no longer necessary as issue was software-related.",
    "expectedVersion": 1
  }
  ```
* **Success Response (`200 OK`)**:
  Returns action with `status: "CANCELLED"` and updated `version`.

---

## 3. Role-Based Dashboard Endpoints

### 3.1. `GET /api/dashboard/requester`
* **Description**: Returns operational ticket metric counters and the 5 most recently updated tickets owned strictly by the authenticated Requester.
* **Authorization**: `REQUESTER` (also accessible by other roles for viewing personal tickets).
* **Success Response (`200 OK`)**:
  ```json
  {
    "metrics": {
      "myOpenTickets": 3,
      "inProgressTickets": 2,
      "resolvedTickets": 5,
      "closedTickets": 12,
      "waitingForRequesterTickets": 1
    },
    "drillDownUrls": {
      "myOpenTickets": "/my-tickets?status=OPEN",
      "inProgressTickets": "/my-tickets?status=IN_PROGRESS",
      "resolvedTickets": "/my-tickets?status=RESOLVED",
      "closedTickets": "/my-tickets?status=CLOSED",
      "waitingForRequesterTickets": "/my-tickets?status=WAITING_FOR_REQUESTER"
    },
    "recentTickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "requestedPriority": "MEDIUM",
        "updatedAt": "2026-10-01T09:14:00.000Z",
        "categoryName": "Hardware"
      }
    ]
  }
  ```
* **Calculation Rules (`BR-12`)**:
  * All metrics query tickets where `requesterId = auth.userId`.
  * `myOpenTickets`: `currentStatus` $\in$ {`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`}.
  * `inProgressTickets`: `currentStatus = 'IN_PROGRESS'`.
  * `resolvedTickets`: `currentStatus = 'RESOLVED'`.
  * `closedTickets`: `currentStatus = 'CLOSED'`.
  * `waitingForRequesterTickets`: `currentStatus = 'WAITING_FOR_REQUESTER'`.
  * `recentTickets`: Top 5 tickets owned by requester ordered by `updatedAt DESC`.

---

### 3.2. `GET /api/dashboard/staff`
* **Description**: Returns operational queues, metric counts, and current-user assigned actions across the system.
* **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only. (Requesters receive `403 Forbidden`).
* **Success Response (`200 OK`)**:
  ```json
  {
    "metrics": {
      "newTickets": 14,
      "openTickets": 23,
      "inProgressTickets": 18,
      "waitingForRequesterTickets": 7,
      "myAssignedTickets": 16,
      "unassignedTickets": 9,
      "highUrgentTickets": 11,
      "myOpenActionsCount": 4
    },
    "deltas": {
      "newTickets": 1,
      "openTickets": -2,
      "inProgressTickets": -1,
      "waitingForRequesterTickets": 1,
      "myAssignedTickets": 1
    },
    "drillDownUrls": {
      "newTickets": "/staff/queue?status=NEW",
      "openTickets": "/staff/queue?status=OPEN",
      "inProgressTickets": "/staff/queue?status=IN_PROGRESS",
      "waitingForRequesterTickets": "/staff/queue?status=WAITING_FOR_REQUESTER",
      "myAssignedTickets": "/staff/queue?ownerId=me",
      "unassignedTickets": "/staff/queue?ownerId=unassigned",
      "highUrgentTickets": "/staff/queue?itPriority=HIGH"
    },
    "recentTickets": [
      {
        "id": 105,
        "ticketNumber": "TKT-2026-000105",
        "summary": "VPN connection drops after 10 minutes",
        "currentStatus": "OPEN",
        "itPriority": "HIGH",
        "requesterName": "Jennifer Anderson",
        "ticketOwnerName": "Michael Brown",
        "updatedAt": "2026-10-01T10:15:00.000Z",
        "categoryName": "Network"
      }
    ]
  }
  ```
* **Calculation Rules (`BR-13`)**:
  * `newTickets`: `Ticket.count({ where: { currentStatus: 'NEW' } })`
  * `openTickets`: `Ticket.count({ where: { currentStatus: 'OPEN' } })`
  * `inProgressTickets`: `Ticket.count({ where: { currentStatus: 'IN_PROGRESS' } })`
  * `waitingForRequesterTickets`: `Ticket.count({ where: { currentStatus: 'WAITING_FOR_REQUESTER' } })`
  * `myAssignedTickets`: `Ticket.count({ where: { ticketOwnerId: auth.userId, currentStatus: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })`
  * `unassignedTickets`: `Ticket.count({ where: { ticketOwnerId: null, currentStatus: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })`
  * `highUrgentTickets`: `Ticket.count({ where: { itPriority: { in: ['HIGH', 'URGENT'] }, currentStatus: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })`
  * `myOpenActionsCount`: `ActionTaken.count({ where: { OR: [{ performedById: auth.userId }, { assigneeId: auth.userId }], status: { in: ['PENDING', 'IN_PROGRESS'] } } })`
  * `deltas`: For each primary card, computes `countToday - countYesterday` evaluated at midnight `Asia/Bangkok` boundaries.
  * `recentTickets`: Top 5 tickets system-wide ordered by `updatedAt DESC` updated within the last 30 calendar days. Empty array `[]` if none.

---

### 3.3. `GET /api/dashboard/admin`
* **Description**: Extends IT Staff operational metrics with concise user-account summary counters.
* **Authorization**: `ADMINISTRATOR` only. (IT Staff and Requesters receive `403 Forbidden`).
* **Success Response (`200 OK`)**:
  ```json
  {
    "ticketMetrics": {
      "newTickets": 14,
      "openTickets": 23,
      "inProgressTickets": 18,
      "waitingForRequesterTickets": 7,
      "myAssignedTickets": 16,
      "unassignedTickets": 9,
      "highUrgentTickets": 11,
      "myOpenActionsCount": 4
    },
    "userMetrics": {
      "totalUsers": 28,
      "activeUsers": 25,
      "inactiveUsers": 3,
      "usersByRole": {
        "REQUESTER": 18,
        "IT_STAFF": 8,
        "ADMINISTRATOR": 2
      }
    },
    "drillDownUrls": {
      "newTickets": "/staff/queue?status=NEW",
      "openTickets": "/staff/queue?status=OPEN",
      "manageUsers": "/admin/users"
    },
    "recentTickets": [
      {
        "id": 105,
        "ticketNumber": "TKT-2026-000105",
        "summary": "VPN connection drops after 10 minutes",
        "currentStatus": "OPEN",
        "itPriority": "HIGH",
        "requesterName": "Jennifer Anderson",
        "ticketOwnerName": "Michael Brown",
        "updatedAt": "2026-10-01T10:15:00.000Z",
        "categoryName": "Network"
      }
    ]
  }
  ```

---

## 4. Ticket Status Workflow & Resolution Gate

### 4.1. `PATCH /api/staff/tickets/:ticketId/status`
* **Description**: Advances ticket status with backend validation of permitted transitions, atomic concurrency lock, and the **Resolution Gate**.
* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced faulty RAM module and ran 24h stress test cleanly.",
    "expectedVersion": 3
  }
  ```
* **Resolution Gate Enforcement (`BR-09`)**:
  When transitioning from active status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) to `RESOLVED` or `CLOSED`:
  The server performs an atomic evaluation inside a database transaction:
  1. Checks if ticket has $\ge 1$ `ActionTaken` record.
  2. Checks if any `ActionTaken` has `status` $\in$ {`PENDING`, `IN_PROGRESS`}.
  3. Checks if any `ActionTaken` has `followUpRequired === true && followUpResolvedAt === null && status !== 'CANCELLED'`.
  4. Checks if `resolutionSummary` is provided ($\ge 5$ characters).
  If any check fails, returns `400 Bad Request` with:
  ```json
  {
    "error": {
      "code": "RESOLUTION_GATE_BLOCKED",
      "message": "Ticket does not satisfy resolution gate requirements.",
      "details": [
        { "code": "NO_ACTIONS_TAKEN", "message": "At least one Action Taken must be recorded before resolving." },
        { "code": "INCOMPLETE_ACTION", "actionId": 5, "message": "Action #5 is currently in progress; complete or cancel it first." },
        { "code": "UNRESOLVED_FOLLOW_UP", "actionId": 3, "field": "followUpNote", "message": "Action #3 has pending follow-up that must be resolved." },
        { "code": "MISSING_RESOLUTION_SUMMARY", "field": "resolutionSummary", "message": "Resolution summary is required (minimum 5 characters)." }
      ]
    }
  }
  ```
* **Optimistic Concurrency Check (`BR-11`)**:
  If `expectedVersion` does not match the database `version`:
  * Returns `409 Conflict`:
    ```json
    {
      "error": {
        "code": "CONFLICT",
        "message": "The ticket was modified by another user. Please reload the ticket to view the latest changes.",
        "currentTicket": { "version": 4, "currentStatus": "IN_PROGRESS", "updatedAt": "2026-10-01T08:45:00.000Z" }
      }
    }
    ```
* **Grandfathering Note**: Tickets transitioning from `RESOLVED` to `CLOSED` bypass the count check to avoid locking legacy resolved tickets.
* **Success Response (`200 OK`)**:
  Returns the updated ticket object with `currentStatus`, `resolutionSummary`, `resolvedAt` (if transitioning to `RESOLVED`), and incremented `version`.

---

### 4.2. `POST /api/tickets/:ticketId/indicate-resolved`
* **Description**: Allows an authenticated Requester to indicate that their issue appears resolved.
* **Authorization**: `REQUESTER` (must be the ticket owner).
* **Behavior**:
  * Sets `problemAppearsResolved = true` and `problemAppearsResolvedAt = now()`.
  * Appends an audit `PublicComment`: `"Requester indicated that the problem appears resolved."`
  * Does NOT advance `currentStatus` or bypass the Resolution Gate.
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "problemAppearsResolved": true,
    "problemAppearsResolvedAt": "2026-10-01T11:00:00.000Z"
  }
  ```

---

## 5. System Health, Validation & Continued APIs (Labs 1–3)

### 5.1. `GET /api/health`
* **Description**: Primary liveness probe and database connectivity health check used for deployment validation and regression verification.
* **Authorization**: Public (No auth header required).
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-01T14:30:00.000Z",
    "uptime": 12450.32,
    "version": "1.4.0",
    "database": {
      "status": "connected",
      "latencyMs": 3
    }
  }
  ```
* **Failure Response (`503 Service Unavailable`)**:
  ```json
  {
    "status": "error",
    "timestamp": "2026-10-01T14:30:00.000Z",
    "error": {
      "code": "DATABASE_UNAVAILABLE",
      "message": "Unable to connect to PostgreSQL database."
    },
    "database": {
      "status": "disconnected"
    }
  }
  ```

### 5.2. Continued Regression Endpoints
The following endpoints from Labs 1, 2, and 3 remain fully supported, validated, and covered by automated regression suites:
* **Lab 1 Foundation**:
  * `GET /api/health`: System status probe.
  * `GET /api/categories`: Category taxonomy listing.
  * `GET /api/related-systems`: Reference integration listing.
  * `GET /api/requesters`: Dev requester fixture listing.
* **Lab 2 Ticket Submission & Attachments**:
  * `GET /api/tickets`: Paginated ticket retrieval for authenticated user.
  * `POST /api/tickets`: Multipart/form-data ticket creation with attachments and validation.
  * `GET /api/tickets/:id`: Ticket detail view with category, requester, status history, and attachments.
  * `POST /api/tickets/:id/attachments`: Upload attachment (PNG, JPG, PDF; size $\le 5\text{MB}$).
  * `GET /api/tickets/:id/attachments/:attachmentId`: Download file stream.
  * `DELETE /api/tickets/:id/attachments/:attachmentId`: Soft-delete attachment.
* **Lab 3 Authentication, RBAC, Queue & Admin**:
  * `POST /api/auth/login`: Issue signed JWT token.
  * `POST /api/auth/logout`: Revoke active session / clear cookie.
  * `GET /api/auth/me`: Authenticated profile and role info.
  * `POST /api/auth/change-password`: First-login or user-initiated password update.
  * `GET /api/tickets/:id/comments`: Public requester-staff communication thread.
  * `POST /api/tickets/:id/comments`: Add public comment.
  * `GET /api/tickets/:id/notes`: Restricted internal staff notes.
  * `POST /api/tickets/:id/notes`: Add restricted internal note.
  * `GET /api/staff/tickets`: IT Staff unified queue with search and status/priority filters.
  * `PATCH /api/staff/tickets/:id/claim`: Claim unassigned ticket (`ticketOwnerId = auth.userId`).
  * `PATCH /api/staff/tickets/:id/assign`: Assign ticket to another active IT Staff member.
  * `PATCH /api/staff/tickets/:id/priority`: Set operational priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `GET /api/admin/users`: User directory with role and status filtering.
  * `POST /api/admin/users`: Create user account.
  * `PATCH /api/admin/users/:id`: Edit user details, active toggle, and role.
  * `POST /api/admin/users/:id/reset-password`: Administrator-initiated password reset forcing first-login reset flag.

---

## 6. Timezone, Date Boundaries & Delta Calculations

### 6.1. Authoritative Timezone
* **System Timezone**: `Asia/Bangkok` (UTC+07:00).
* All internal business calendar calculations (such as start-of-day, end-of-day, yesterday comparison, and recent 30-day windows) are computed relative to `Asia/Bangkok`.
* **Wire Protocol Serialization**: All JSON timestamps are transmitted as ISO 8601 UTC strings with millisecond precision (`YYYY-MM-DDTHH:mm:ss.sssZ`). Clients parse and format timestamps into local display time (`MMM DD, YYYY hh:mm A`).

### 6.2. Calendar Boundaries & Formulas
1. **"Today" Boundary**:
   * Starts at `00:00:00.000` `Asia/Bangkok` on the current calendar day.
   * Converted to UTC: `currentDate_Bangkok.setHours(0,0,0,0).toISOString()`.
2. **"Yesterday" Boundary**:
   * Starts at `00:00:00.000` and ends at `23:59:59.999` `Asia/Bangkok` of the preceding calendar day.
3. **"From Yesterday" Delta Calculation**:
   * Operational metric cards return a `deltas` payload representing daily velocity:
     $$\Delta_{\text{metric}} = \text{Count}_{\text{today}} - \text{Count}_{\text{yesterday}}$$
   * Example: If 14 new tickets exist today compared to 13 yesterday, `deltas.newTickets = 1`.
   * Formatted in the UI as `+N from yesterday` (green), `-N from yesterday` (steel blue), or `0 from yesterday` (gray).
4. **"Recently Updated" Date Boundary**:
   * `recentTickets` returns the top 5 tickets ordered by `updatedAt DESC` updated within the last 30 calendar days:
     $$\text{updatedAt} \ge (\text{now}() - 30\text{ days})$$
   * If fewer than 5 tickets exist in the last 30 days, returns all matching tickets (down to empty `[]`).
5. **"Recently Resolved" Date Boundary**:
   * `resolvedTickets` counts tickets where `currentStatus = 'RESOLVED'` and $\text{resolvedAt} \ge (\text{now}() - 30\text{ days})$.
6. **Zero-Count & Empty Behavior**:
   * When no records match a metric query, the backend returns count `0` and delta `0`.
   * `recentTickets` returns empty array `[]`.
   * The client renders friendly, non-error empty state UI cards.
