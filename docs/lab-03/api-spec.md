# Lab 3 REST API Specification

## 1. Overview & General Standards

* **Base URL**: `/api`
* **Content Types**:
  * Default: `application/json; charset=utf-8`
  * File Uploads: `multipart/form-data`
  * File Downloads: Binary streaming with appropriate `Content-Type` and `Content-Disposition`.
* **Authentication Header**:
  * Standard HTTP Header: `Authorization: Bearer <jwt-token>`
  * Required on all protected endpoints.
  * The server derives user identity (`userId`, `role`, `mustChangePassword`) strictly from the verified token. Client-supplied `requesterId` parameters are completely eliminated and ignored.
  * **Mandatory Password Change Route Guard**: If an authenticated user has `mustChangePassword = true`, any request to general endpoints (e.g. `/api/tickets/*`, `/api/staff/*`, `/api/admin/*`) is intercepted and rejected with HTTP 403 Forbidden (`PASSWORD_CHANGE_REQUIRED`), allowing access only to `GET /api/auth/me`, `POST /api/auth/logout`, and `POST /api/auth/change-password`.
* **Standard Error Response Format**:
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED | FORBIDDEN | PASSWORD_CHANGE_REQUIRED | VALIDATION_ERROR | NOT_FOUND | BAD_REQUEST | CONFLICT | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA_TYPE | GONE | INTERNAL_ERROR",
      "message": "Human-readable error description",
      "details": [
        { "field": "password", "message": "Password must be at least 8 characters" }
      ]
    }
  }
  ```

---

## 2. Authentication & Credential Endpoints

### `POST /api/auth/login`
* **Description**: Authenticates user via email and password, returning JWT token and sanitized user profile. Email is sanitized with `.toLowerCase().trim()`.
* **Authentication**: None (Public)
* **Request Body**:
  ```json
  {
    "email": "user@kmutt.ac.th",
    "password": "Password123!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@kmutt.ac.th",
      "name": "Jennifer Anderson",
      "role": "REQUESTER",
      "mustChangePassword": false
    }
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing email or password.
  * `401 Unauthorized`: Invalid credentials or inactive account (`isActive = false`).

---

### `POST /api/auth/logout`
* **Description**: Invalidates current user session/token.
* **Authentication**: Required (`Bearer <token>`)
* **Success Response (`200 OK`)**:
  ```json
  { "message": "Logged out successfully" }
  ```

---

### `GET /api/auth/me`
* **Description**: Retrieves current authenticated user's profile and permissions.
* **Authentication**: Required (`Bearer <token>`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@kmutt.ac.th",
      "name": "Jennifer Anderson",
      "role": "REQUESTER",
      "mustChangePassword": false
    }
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Missing, expired, or invalid token.

---

### `POST /api/auth/change-password`
* **Description**: Changes user password. Used for mandatory first-login password update or self-service update.
* **Authentication**: Required (`Bearer <token>`)
* **Request Body**:
  ```json
  {
    "currentPassword": "InitialPassword123!",
    "newPassword": "NewSecurePassword2026!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Password changed successfully",
    "mustChangePassword": false
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Validation failure (new password < 8 chars, fails complexity rules, or `newPassword === currentPassword`).
  * `401 Unauthorized`: Current password incorrect.

---

## 3. Reference Data Endpoints

### `GET /api/categories`
* **Description**: Retrieves all supported IT request categories.
* **Authentication**: Optional / Public
* **Success Response (`200 OK`)**:
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

---

### `GET /api/related-systems`
* **Description**: Retrieves all active Related Systems.
* **Authentication**: Optional / Public
* **Success Response (`200 OK`)**:
  ```json
  [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" }
  ]
  ```

---

## 4. Requester Ticket & Attachment Endpoints

### `POST /api/tickets`
* **Description**: Creates a new ticket. The authenticated user ID is automatically recorded as `requesterId`.
* **Authentication**: Required (Roles: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `categoryId`: Integer (Required)
  * `relatedSystemId`: Integer (Required)
  * `summary`: String, 5–100 chars (Required, trimmed)
  * `description`: String, 10–2000 chars (Required, trimmed)
  * `requestedPriority`: `LOW | MEDIUM | HIGH | URGENT` (Optional, default `MEDIUM`)
  * `attachments`: Files up to 5 items, max 5 MB each (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`).
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Cannot access campus VPN from off-campus",
    "currentStatus": "NEW",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "createdAt": "2026-09-17T10:00:00.000Z"
  }
  ```

---

### `GET /api/tickets/my-tickets`
* **Description**: Retrieves paginated tickets owned strictly by the currently authenticated user.
* **Authentication**: Required (`Bearer <token>`)
* **Query Parameters**:
  * `search`: String (searches summary and ticket number)
  * `categoryId`: Integer
  * `status`: `TicketStatus`
  * `priority`: `Priority`
  * `page`: Integer (default 1)
  * `pageSize`: Integer (default 10, clamped 1–50)
  * `sortBy`: `createdAt | requestedPriority | currentStatus` (default `createdAt`)
  * `sortOrder`: `asc | desc` (default `desc`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Cannot access campus VPN from off-campus",
        "category": { "id": 4, "name": "Network" },
        "relatedSystem": { "id": 3, "name": "VPN" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "NEW",
        "createdAt": "2026-09-17T10:00:00.000Z",
        "updatedAt": "2026-09-17T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### `GET /api/tickets/:id`
* **Description**: Retrieves single ticket details with active attachments. Requesters can only retrieve tickets they own; IT Staff and Admins can retrieve any ticket.
* **Authentication**: Required (`Bearer <token>`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Cannot access campus VPN from off-campus",
    "description": "Full description here...",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "NEW",
    "problemAppearsResolved": false,
    "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer@kmutt.ac.th" },
    "ticketOwner": null,
    "category": { "id": 4, "name": "Network" },
    "relatedSystem": { "id": 3, "name": "VPN" },
    "attachments": [
      {
        "id": 5,
        "fileName": "sample_battery_report.pdf",
        "originalName": "battery_report.pdf",
        "fileSize": 42,
        "mimeType": "application/pdf",
        "isRemoved": false,
        "uploadedAt": "2026-09-17T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-09-17T10:00:00.000Z",
    "updatedAt": "2026-09-17T10:00:00.000Z"
  }
  ```
* **Error Responses**:
  * `403 Forbidden` / `404 Not Found`: Ticket does not belong to the authenticated Requester.

---

### `POST /api/tickets/:id/indicate-resolved`
* **Description**: Allows the ticket owner (Requester) to indicate that their issue appears resolved. Does not change formal status to `RESOLVED` or `CLOSED`.
* **Authentication**: Required (Ticket Owner only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "problemAppearsResolved": true,
    "problemAppearsResolvedAt": "2026-09-17T11:00:00.000Z"
  }
  ```

---

### `POST /api/tickets/:id/attachments`
* **Description**: Uploads a new attachment to an existing ticket. Enforces maximum 5 active attachments per ticket. Requesters can only upload to owned tickets; IT Staff and Admins can upload to any ticket.
* **Authentication**: Required (`Bearer <token>`)
* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `file`: Binary file (allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; size: 1 byte to 5,242,880 bytes).
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": 6,
    "ticketId": 12,
    "originalName": "network_trace.png",
    "fileSize": 204800,
    "mimeType": "image/png",
    "isRemoved": false,
    "uploadedAt": "2026-09-17T10:15:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Ticket already has 5 active attachments, or empty/invalid file.
  * `403 Forbidden`: Ticket No.t owned by Requester.
  * `413 Payload Too Large`: File exceeds 5 MB.
  * `415 Unsupported Media Type`: File type not permitted.

---

### `GET /api/attachments/:id`
* **Description**: Retrieves metadata for a single attachment.
* **Authentication**: Required (`Bearer <token>`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 6,
    "ticketId": 12,
    "originalName": "network_trace.png",
    "fileSize": 204800,
    "mimeType": "image/png",
    "isRemoved": false,
    "removedReason": null,
    "removedAt": null,
    "uploadedAt": "2026-09-17T10:15:00.000Z"
  }
  ```

---

### `GET /api/attachments/:id/download`
* **Description**: Streams the binary file of an active attachment. Blocked if attachment is soft-removed (`isRemoved = true`). Requesters can only download attachments from owned tickets.
* **Authentication**: Required (`Bearer <token>`)
* **Success Response (`200 OK`)**:
  * Binary stream with `Content-Disposition: attachment; filename="..."` and `Content-Type`.
* **Error Responses**:
  * `403 Forbidden` / `404 Not Found`: Requester does not own the parent ticket.
  * `410 Gone`: Attachment has been soft-removed.

---

### `PATCH /api/attachments/:id/soft-remove`
* **Description**: Soft-removes an attachment, preserving metadata while permanently blocking binary file download.
* **Authentication**: Required (`Bearer <token>`)
* **Request Body**:
  ```json
  {
    "removedReason": "Uploaded incorrect diagnostic report"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 6,
    "isRemoved": true,
    "removedReason": "Uploaded incorrect diagnostic report",
    "removedAt": "2026-09-17T10:20:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing `removedReason`, shorter than 3 characters, or attachment is already removed (`"Attachment is already removed"`).
  * `403 Forbidden`: Requester does not own the parent ticket.

---

## 5. IT Staff Queue & Operational Endpoints

### `GET /api/staff/tickets`
* **Description**: Retrieves all tickets across all requesters for the IT Staff Ticket Queue.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Query Parameters**:
  * `search`: String
  * `categoryId`: Integer
  * `status`: `TicketStatus`
  * `itPriority`: `Priority`
  * `ownerId`: Integer (`0` or `unassigned` for unassigned tickets)
  * `page`: Integer (default 1)
  * `pageSize`: Integer (default 10, clamped 1–50)
  * `sortBy`: `createdAt | itPriority | currentStatus` (default `createdAt`)
  * `sortOrder`: `asc | desc` (default `desc`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Cannot access campus VPN from off-campus",
        "requester": { "id": 1, "name": "Jennifer Anderson" },
        "category": { "id": 4, "name": "Network" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "NEW",
        "ticketOwner": null,
        "createdAt": "2026-09-17T10:00:00.000Z",
        "updatedAt": "2026-09-17T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 24,
      "totalPages": 3
    }
  }
  ```
* **Error Responses**:
  * `403 Forbidden`: User role is `REQUESTER`.

---

### `PATCH /api/tickets/:id/assignment`
* **Description**: Claims ticket ownership or assigns ownership to an active IT Staff or Administrator.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "ownerId": 3
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "ticketOwnerId": 3,
    "currentStatus": "OPEN"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: `ownerId` does not reference an active user with role `IT_STAFF` or `ADMINISTRATOR`.
  * `403 Forbidden`: Non-staff user.

---

### `PATCH /api/tickets/:id/priority`
* **Description**: Updates the IT Priority of a ticket.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "itPriority": "URGENT"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "itPriority": "URGENT",
    "requestedPriority": "HIGH"
  }
  ```

---

### `PATCH /api/tickets/:id/status`
* **Description**: Transitions ticket status per the approved lifecycle transition matrix.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS",
    "resolutionSummary": "Optional text for RESOLVED status"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "currentStatus": "IN_PROGRESS",
    "resolutionSummary": null
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Invalid status transition requested (violates transition matrix).

---

## 6. Discussions: Public Comments & Internal Notes

### `GET /api/tickets/:id/comments`
* **Description**: Retrieves append-only Public Comments for a ticket.
* **Authentication**: Required (Requester for owned ticket, IT Staff, Admin)
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "ticketId": 12,
      "content": "We have checked the VPN gateway and need more log info.",
      "author": { "id": 2, "name": "Staff Alice", "role": "IT_STAFF" },
      "createdAt": "2026-09-17T10:15:00.000Z"
    }
  ]
  ```

---

### `POST /api/tickets/:id/comments`
* **Description**: Creates a new append-only Public Comment. Content must be 1 to 2000 characters after whitespace trimming.
* **Authentication**: Required (Requester for owned ticket, IT Staff, Admin)
* **Request Body**:
  ```json
  {
    "content": "Uploaded the requested network diagnostic log."
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": 2,
    "ticketId": 12,
    "content": "Uploaded the requested network diagnostic log.",
    "author": { "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER" },
    "createdAt": "2026-09-17T10:20:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Empty or whitespace-only content, or content exceeding 2000 characters.

---

### `GET /api/tickets/:id/notes`
* **Description**: Retrieves role-restricted Internal Notes. Requesters are strictly barred.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "ticketId": 12,
      "content": "Known issue on Gateway cluster 3 after firmware update.",
      "author": { "id": 2, "name": "Staff Alice", "role": "IT_STAFF" },
      "createdAt": "2026-09-17T10:12:00.000Z"
    }
  ]
  ```
* **Error Responses**:
  * `403 Forbidden`: Requester user access attempt (returns generic forbidden without note data).

---

### `POST /api/tickets/:id/notes`
* **Description**: Appends an Internal Note. Content must be 1 to 2000 characters after whitespace trimming.
* **Authentication**: Required (Roles: `IT_STAFF`, `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "content": "Investigating firewall rule changes made yesterday."
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": 2,
    "ticketId": 12,
    "content": "Investigating firewall rule changes made yesterday.",
    "author": { "id": 2, "name": "Staff Alice", "role": "IT_STAFF" },
    "createdAt": "2026-09-17T10:25:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Empty or whitespace-only content, or content exceeding 2000 characters.

---

## 7. Administrator User Management Endpoints

### `GET /api/admin/users`
* **Description**: Lists all user accounts with search by name/email and optional role filter.
* **Authentication**: Required (Role: `ADMINISTRATOR`)
* **Query Parameters**:
  * `search`: String
  * `role`: `REQUESTER | IT_STAFF | ADMINISTRATOR`
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer@kmutt.ac.th",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ]
  ```
* **Error Responses**:
  * `403 Forbidden`: Non-Administrator user access attempt.

---

### `POST /api/admin/users`
* **Description**: Creates a new user account with one role and an initial password. Email is normalized to `.toLowerCase().trim()`.
* **Authentication**: Required (Role: `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "name": "Bob IT",
    "email": "bob@toktickit.local",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "InitialPassword123!"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": 15,
    "name": "Bob IT",
    "email": "bob@toktickit.local",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-17T12:00:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing fields or invalid password complexity.
  * `409 Conflict`: Email already exists.

---

### `PATCH /api/admin/users/:id`
* **Description**: Edits an existing user account's name, email, role, or activation status. Email uniqueness check excludes the user's own `id`.
* **Authentication**: Required (Role: `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "name": "Bob IT Senior",
    "email": "bob.senior@toktickit.local",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": 15,
    "name": "Bob IT Senior",
    "email": "bob.senior@toktickit.local",
    "role": "IT_STAFF",
    "isActive": false,
    "updatedAt": "2026-09-17T12:10:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Attempting to deactivate own admin account or removing/deactivating the last active administrator.
  * `409 Conflict`: Email address is already taken by another account.

---

### `POST /api/admin/users/:id/reset-password`
* **Description**: Sets a new initial password for a user, flagging `mustChangePassword = true`.
* **Authentication**: Required (Role: `ADMINISTRATOR`)
* **Request Body**:
  ```json
  {
    "initialPassword": "ResetPassword123!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Password reset successfully. User must change password at next login.",
    "mustChangePassword": true
  }
  ```
