# Lab 2 REST API Specification

## 1. Overview & General Standards

* **Base URL**: `/api`
* **Content Types**:
  * Default: `application/json; charset=utf-8`
  * File Uploads: `multipart/form-data`
  * File Downloads: Binary streaming with appropriate `Content-Type` and `Content-Disposition`.
* **Standard Error Response Format**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | BAD_REQUEST | CONFLICT | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA_TYPE | GONE | INTERNAL_ERROR",
      "message": "Human-readable error description",
      "details": [
        { "field": "summary", "message": "Summary must be at least 5 characters" }
      ]
    }
  }
  ```

---

## 2. Endpoints Specification

### 2.1. Reference & Context Endpoints

#### `GET /api/requesters`
* **Description**: Retrieves all active Development Requesters for the simulated login context selector. Inactive Requesters are filtered out.
* **Headers**: None
* **Status**: `200 OK`
* **Response Body**:
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@kmutt.ac.th",
      "department": "Computer Engineering"
    },
    {
      "id": 2,
      "name": "David Lee",
      "email": "david.lee@kmutt.ac.th",
      "department": "Information Technology"
    }
  ]
  ```

---

#### `GET /api/categories`
* **Description**: Retrieves all supported IT request categories in ascending order by ID.
* **Headers**: None
* **Status**: `200 OK`
* **Response Body**:
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

---

#### `GET /api/related-systems`
* **Description**: Retrieves all active Related Systems.
* **Headers**: None
* **Status**: `200 OK`
* **Response Body**:
  ```json
  [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
  ```

---

### 2.2. Ticket Management Endpoints

#### `POST /api/tickets`
* **Description**: Creates a new IT support ticket for the specified Requester. Supports optional file attachments via `multipart/form-data`.
* **Content-Type**: `multipart/form-data` or `application/json`
* **Request Fields**:
  * `requesterId` (Number, required, active requester ID)
  * `categoryId` (Number, required)
  * `relatedSystemId` (Number, required)
  * `requestedPriority` (String, required: `"LOW" | "MEDIUM" | "HIGH" | "URGENT"`)
  * `summary` (String, required, 5–100 chars after trimming)
  * `description` (String, required, 10–2000 chars after trimming)
  * `attachments` (Files, optional, max 5 files, each ≤ 5 MB, extensions `.jpg, .jpeg, .png, .webp, .pdf`)
* **Responses**:
  * `201 Created`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requesterId": 1,
      "categoryId": 2,
      "relatedSystemId": 7,
      "summary": "Laptop battery drains quickly",
      "description": "The laptop loses charge within 45 minutes under normal office tasks.",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-09-03T10:00:00.000Z",
      "updatedAt": "2026-09-03T10:00:00.000Z",
      "attachments": [
        {
          "id": 1,
          "originalName": "battery_report.pdf",
          "fileSize": 1048576,
          "mimeType": "application/pdf",
          "isRemoved": false
        }
      ]
    }
    ```
  * `400 Bad Request`: Field validation error (e.g. summary too short, empty file, inactive requester ID, >5 files).
  * `413 Payload Too Large`: One or more attachments exceed 5 MB limit.
  * `415 Unsupported Media Type`: Non-allowed attachment MIME type.

---

#### `GET /api/tickets`
* **Description**: Retrieves a paginated list of tickets owned by the requesting user.
* **Query Parameters**:
  * `requesterId` (Number, required) — ID of the active requester.
  * `search` (String, optional) — Case-insensitive search on ticket number and summary.
  * `categoryId` (Number, optional) — Filter by category ID.
  * `priority` (String, optional) — Filter by requested priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `status` (String, optional) — Filter by ticket status (`NEW`, `IN_PROGRESS`, etc.).
  * `page` (Number, optional, default `1`).
  * `pageSize` (Number, optional, default `10`, max `50`).
  * `sortBy` (String, optional, default `"createdAt"`: `"createdAt" | "requestedPriority" | "ticketNumber" | "currentStatus"`).
  * `sortOrder` (String, optional, default `"desc"`: `"asc" | "desc"`).
* **Responses**:
  * `200 OK`:
    ```json
    {
      "data": [
        {
          "id": 101,
          "ticketNumber": "TKT-2026-000101",
          "summary": "Laptop battery drains quickly",
          "category": { "id": 2, "name": "Hardware" },
          "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
          "requestedPriority": "MEDIUM",
          "itPriority": "MEDIUM",
          "currentStatus": "NEW",
          "createdAt": "2026-09-03T10:00:00.000Z",
          "updatedAt": "2026-09-03T10:00:00.000Z",
          "attachmentCount": 1
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
  * `400 Bad Request`: Missing `requesterId` or invalid query parameters.

---

#### `GET /api/tickets/:id`
* **Description**: Retrieves full details and attachment list for a single ticket. Enforces ownership check against `requesterId`.
* **Query Parameters**:
  * `requesterId` (Number, required) — Context requester ID for authorization.
* **Responses**:
  * `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requester": {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.anderson@kmutt.ac.th",
        "department": "Computer Engineering"
      },
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "summary": "Laptop battery drains quickly",
      "description": "The laptop loses charge within 45 minutes under normal office tasks.",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "resolutionSummary": null,
      "createdAt": "2026-09-03T10:00:00.000Z",
      "updatedAt": "2026-09-03T10:00:00.000Z",
      "attachments": [
        {
          "id": 1,
          "originalName": "battery_report.pdf",
          "fileSize": 1048576,
          "mimeType": "application/pdf",
          "isRemoved": false,
          "removedReason": null,
          "uploadedAt": "2026-09-03T10:00:00.000Z"
        },
        {
          "id": 2,
          "originalName": "old_screenshot.png",
          "fileSize": 204800,
          "mimeType": "image/png",
          "isRemoved": true,
          "removedReason": "Uploaded incorrect log file",
          "removedAt": "2026-09-03T10:15:00.000Z",
          "uploadedAt": "2026-09-03T10:00:00.000Z"
        }
      ]
    }
    ```
  * `403 Forbidden`: Ticket exists but belongs to another Requester.
  * `404 Not Found`: Ticket does not exist.

---

### 2.3. Attachment Lifecycle Endpoints

#### `GET /api/attachments/:id`
* **Description**: Retrieves metadata for a specific attachment.
* **Query Parameters**:
  * `requesterId` (Number, required)
* **Responses**:
  * `200 OK`:
    ```json
    {
      "id": 1,
      "ticketId": 101,
      "originalName": "battery_report.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "isRemoved": false,
      "removedReason": null,
      "removedAt": null,
      "uploadedAt": "2026-09-03T10:00:00.000Z"
    }
    ```
  * `403 Forbidden`: Requester does not own the parent ticket.
  * `404 Not Found`: Attachment record does not exist.

---

#### `POST /api/tickets/:id/attachments`
* **Description**: Adds a single new attachment to an existing ticket.
* **Content-Type**: `multipart/form-data`
* **Request Fields**:
  * `requesterId` (Number, required)
  * `file` (File, required, ≤ 5 MB, allowed type)
* **Responses**:
  * `201 Created`:
    ```json
    {
      "id": 3,
      "ticketId": 101,
      "originalName": "diagnostic_log.png",
      "fileSize": 450120,
      "mimeType": "image/png",
      "isRemoved": false,
      "uploadedAt": "2026-09-03T10:30:00.000Z"
    }
    ```
  * `400 Bad Request`: Ticket already has 5 active attachments or file is missing.
  * `403 Forbidden`: Requester does not own the ticket.
  * `413 Payload Too Large`: File exceeds 5 MB limit.
  * `415 Unsupported Media Type`: Non-allowed file format.

---

#### `GET /api/attachments/:id/download`
* **Description**: Downloads the binary file of an active attachment.
* **Query Parameters**:
  * `requesterId` (Number, required)
* **Responses**:
  * `200 OK`: Binary stream with headers:
    * `Content-Type: <mimeType>`
    * `Content-Disposition: attachment; filename="<originalName>"`
  * `403 Forbidden`: Requester does not own the parent ticket.
  * `404 Not Found`: Attachment record does not exist.
  * `410 Gone`: Attachment has been soft-removed; binary download is blocked.

---

#### `PATCH /api/attachments/:id/soft-remove`
* **Description**: Soft-removes an attachment and records the user-supplied reason.
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "requesterId": 1,
    "reason": "Attachment contains sensitive credentials by mistake"
  }
  ```
* **Responses**:
  * `200 OK`:
    ```json
    {
      "id": 1,
      "isRemoved": true,
      "removedReason": "Attachment contains sensitive credentials by mistake",
      "removedAt": "2026-09-03T11:00:00.000Z"
    }
    ```
  * `400 Bad Request`: Missing reason (minimum 3 characters).
  * `403 Forbidden`: Requester does not own the parent ticket.
  * `404 Not Found`: Attachment not found.
  * `409 Conflict`: Attachment is already soft-removed.
