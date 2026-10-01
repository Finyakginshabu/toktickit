# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete and harden the core TokTickIT service-desk workflow by introducing a parent-child work structure with **Actions Taken**, enforcing a backend-authoritative **Ticket Resolution Gate** and status transition rules, implementing role-tailored operational **Dashboards** (for Requesters, IT Staff, and Administrators), and achieving 100% regression safety, optimistic concurrency control, and accessibility hardening across all features built in Labs 1 through 3.

---

## 2. Stakeholder Request Interpretation
The stakeholder requires a reliable mechanism to plan, execute, assign, and audit actual technical work performed on support tickets. While Lab 3 enabled communication and high-level ticket assignment, IT Staff need granular line-item records under each ticket detailing what was done, when, by whom, the observed outcome, whether follow-up is necessary, and pointers to relevant attachments or documentation. 

To ensure accountability, the primary Ticket Owner remains responsible for the ticket lifecycle, but any active IT Staff or Administrator may log or be assigned concrete action lines. Tickets must no longer be prematurely marked as resolved; the backend must strictly enforce a Resolution Gate requiring verified work completion and resolution notes before status closure. Furthermore, Requesters and IT personnel require concise, real-time dashboards to prioritize daily tasks and monitor ticket velocity without wading through unmanageable grids. Finally, the entire application must be hardened against concurrent update collisions, input loss, and accessibility gaps under the Zen Green design system.

---

## 3. Scope

### Included
1. **Actions Taken Subsystem (Parent-Child Work Structure)**:
   * Data entity `ActionTaken` linked directly to `Ticket` with fields:
     * `actionDateTime` (DateTime, when action occurred)
     * `actionDescription` (String, min 5 chars, max 2000 chars)
     * `result` (String, required when status is `COMPLETED`, max 2000 chars)
     * `performedById` (Int, foreign key to `User`, auto-captured from authenticated actor)
     * `assigneeId` (Int, optional foreign key to `User`, must be active `IT_STAFF` or `ADMINISTRATOR`)
     * `status` (Enum: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
     * `followUpRequired` (Boolean, default `false`)
     * `followUpNote` (String, required if `followUpRequired = true`, max 2000 chars)
     * `followUpResolvedAt` (DateTime, records when follow-up was completed/cleared)
     * `attachmentNotes` (String, optional reference to attachments, max 1000 chars)
     * `version` (Int, default 1, optimistic locking)
     * `createdAt`, `updatedAt`
   * IT Staff and Admin capabilities to list, create, edit, reassign, transition status, and resolve follow-up items.
   * Inactive assignee rejection on creation and editing.
   * Requester read-only view of Actions Taken on owned tickets; strict backend authorization returning `404 Not Found` if trying to access unowned tickets.
   * Append-only integrity: Actions cannot be deleted; cancellation is performed by setting status to `CANCELLED` with an explanatory note.
   * Actions cannot be added or edited on tickets in `CLOSED` or `CANCELLED` status.
2. **Ticket Status Transition Rules & Resolution Gate**:
   * Complete 8-status lifecycle transition matrix with role enforcement: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
   * Backend-enforced **Resolution Gate**: Rejection of transitions to `RESOLVED` (and direct active jumps to `CLOSED`) unless:
     * At least one `ActionTaken` record exists on the ticket.
     * No `ActionTaken` on the ticket is incomplete (`status` $\in$ {`PENDING`, `IN_PROGRESS`}).
     * No `ActionTaken` on the ticket has an unresolved follow-up (`followUpRequired == true && followUpResolvedAt == null && status != CANCELLED`).
     * A non-empty, trimmed `resolutionSummary` ($\ge 5$ characters) is provided.
   * Grandfathering: Legacy tickets from Labs 1–3 already in `RESOLVED` or `CLOSED` status are grandfathered and not retroactively blocked.
   * Requester "Problem Appears Resolved" indication (`POST /api/tickets/:id/indicate-resolved`) remains purely advisory and is visibly highlighted to IT Staff on Ticket Detail for review.
3. **Optimistic Concurrency & Safe Updates**:
   * Stale-update detection for concurrent edits on tickets and actions taken via integer `version` (or timestamp comparison), returning `409 Conflict` with the latest server state to prevent overwriting coworker updates.
   * Atomic database transactions for Resolution Gate evaluation and status advancement.
4. **Role-Tailored Dashboards**:
   * **Requester Dashboard**: 4 primary metric cards (`My Open`, `In Progress`, `Resolved`, `Closed`), an attention highlight for `Waiting for Requester`, Recent Tickets table, and Quick Actions (`Create Ticket`, `View My Tickets`).
   * **IT Staff Dashboard**: 5 operational metric cards (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`), secondary alerts for `Unassigned` and `High/Urgent`, current-user assigned actions count (`My Open Actions`), Recent Tickets table, and drill-down links to filtered queues.
   * **Administrator Dashboard**: Extends IT Staff operational metrics with concise user-account summaries (`Total Users`, `Active Users`, `Inactive Users`, and breakdown by `usersByRole`).
5. **Zen Green UI Extensions & Accessibility Hardening**:
   * Application shell `AppHeader` integration with active *Dashboard* navigation tab across all roles.
   * Resolution Gate modal checklist detailing exact blocking items (with Action IDs).
   * WCAG AA accessibility: non-color cues, high-contrast text, keyboard focus outlines, ARIA labels, and double-click prevention via busy states.
6. **Regression Preservation**:
   * 100% preservation of all features from Labs 1, 2, and 3.

### Excluded
1. Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
2. Email, SMS, LINE, push, or external notification services.
3. Inventory consumption, spare-parts management, purchasing, or service cost accounting.
4. Time-sheet billing, payroll, or detailed labor-cost calculations.
5. Multi-level approval workflows and electronic signatures.
6. Advanced business-intelligence tools, custom report builders, or export warehouses.
7. Multi-tenant organizations and production-scale cloud operations.
8. New product features not approved in the Sprint 4 engineering contract.
9. Permanent user hard deletion, bulk user operations, and profile avatar management.

---

## 4. Functional Requirements

### Actions Taken Subsystem
* **FR-01 (Actions Taken Listing)**: The system shall allow IT Staff and Administrators to list Actions Taken for any ticket, and Requesters to view Actions Taken for owned tickets in read-only format. Actions shall be returned in stable chronological order (`actionDateTime ASC, id ASC`).
* **FR-02 (Actions Taken Creation)**: The system shall allow IT Staff and Administrators to record an Action Taken specifying Action Date/Time, Action Description, optional Result, optional Assignee, Status, Follow-Up Required flag, Follow-Up Note, and Attachment Notes.
* **FR-03 (Authoritative Performer Attribution)**: The system shall automatically record the authenticated user as the performer (`performedById`) upon creation of an Action Taken line.
* **FR-04 (Assignee Assignment & Validation)**: The system shall allow assigning an Action Taken to an active IT Staff or Administrator account (`assigneeId`), and shall strictly reject assignment to inactive users or Requesters with `400 Bad Request` (`INVALID_ASSIGNEE`).
* **FR-05 (Actions Taken Modification & Status Lifecycle)**: The system shall allow IT Staff and Administrators to edit existing Action Taken records, transition status across `PENDING`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`, reassign active assignees, and update follow-up requirements.
* **FR-06 (Follow-Up Management & Completion)**: The system shall mandate a non-empty `followUpNote` ($\ge 5$ chars) whenever `followUpRequired` is `true`. The system shall provide an action to mark follow-up as resolved, stamping `followUpResolvedAt = now()` without erasing `followUpNote`.
* **FR-07 (Append-Only & Cancellation Rules)**: The system shall prevent hard deletion of Actions Taken. An action is removed from active consideration by setting status to `CANCELLED`.
* **FR-08 (Requester Write Prohibition & Privacy Boundary)**: The system shall prevent Requesters from creating, updating, or cancelling Actions Taken (`403 Forbidden`). Requesting actions for an unowned ticket shall return `404 Not Found` to prevent leaking ticket existence.
* **FR-09 (Ticket State Lock on Actions)**: The system shall reject adding or updating Actions Taken on tickets that are in `CLOSED` or `CANCELLED` status with `400 Bad Request`.

### Ticket Status & Workflow Subsystem
* **FR-10 (Status Transition Matrix Enforcement)**: The system shall enforce permitted ticket status transitions according to the defined lifecycle matrix and authorized roles.
* **FR-11 (Authoritative Resolution Gate)**: The backend shall intercept and reject any request to advance ticket status to `RESOLVED` (or direct active jump to `CLOSED`) unless:
  1. The ticket has at least one associated `ActionTaken` record.
  2. Zero associated `ActionTaken` records have status $\in$ {`PENDING`, `IN_PROGRESS`}.
  3. Zero associated `ActionTaken` records have unresolved follow-up (`followUpRequired == true && followUpResolvedAt == null && status != CANCELLED`).
  4. A valid, non-empty `resolutionSummary` ($\ge 5$ characters) is provided.
  Violations shall return `400 Bad Request` (`RESOLUTION_GATE_BLOCKED`) with a structured list of unmet criteria including relevant `actionId`s.
* **FR-12 (Advisory Requester Resolution)**: The system shall allow an authenticated Requester to indicate `problemAppearsResolved = true` on an owned ticket via `POST /api/tickets/:id/indicate-resolved`. The flag and timestamp shall be visibly surfaced on IT Staff Ticket Detail, but shall NOT advance `currentStatus` or bypass the Resolution Gate.
* **FR-13 (Optimistic Concurrency Control)**: The system shall detect stale updates on tickets and actions taken using integer `version` (or timestamp verification), rejecting colliding submissions with `409 Conflict` and returning the latest server record.

### Dashboards Subsystem
* **FR-14 (Requester Dashboard API & UI)**: The system shall provide an endpoint and UI summarizing owned tickets for the authenticated Requester:
  * Metric cards: `myOpenTickets`, `inProgressTickets`, `resolvedTickets`, `closedTickets`.
  * Highlight banner: `waitingForRequesterTickets`.
  * `recentTickets`: Up to 5 most recently updated tickets owned by user.
  * Quick action shortcuts: `Create Ticket`, `View My Tickets`.
* **FR-15 (IT Staff Dashboard API & UI)**: The system shall provide an endpoint and UI summarizing operational queues across all tickets:
  * Primary metric cards: `newTickets`, `openTickets`, `inProgressTickets`, `waitingForRequesterTickets`, `myAssignedTickets`.
  * Secondary indicators: `unassignedTickets`, `highUrgentTickets`, `myOpenActionsCount` (count of pending/in-progress actions assigned to or performed by the current user).
  * `recentTickets`: Up to 5 most recently updated tickets system-wide.
  * Quick action shortcuts: `Create Ticket`, `Search Tickets`, `My Queue`, `Unassigned Queue`.
* **FR-16 (Administrator Dashboard API & UI)**: The system shall provide an endpoint and UI combining all IT Staff operational metrics with concise user-account summary metrics (`totalUsers`, `activeUsers`, `inactiveUsers`, and `usersByRole`).
* **FR-17 (Dashboard Drill-Down Navigation)**: Every dashboard card with a count $> 0$ shall provide an accessible link routing to the queue or tickets list with query parameters pre-filtered.

### UI, Accessibility & Regression Subsystem
* **FR-18 (Role-Based Dashboard Navigation)**: The application shell navigation bar shall display *Dashboard* as the default landing tab for all authenticated roles.
* **FR-19 (Form Resilience & Double-Click Prevention)**: All form submit buttons shall display busy indicators and disable controls during in-flight network requests. Recoverable validation failures shall preserve user inputs.
* **FR-20 (Full Stack Regression)**: The application shall maintain 100% test passing rates across all Lab 1, Lab 2, and Lab 3 test suites.

---

## 5. Business Rules (BR)

### Actions Taken Rules
* **BR-01 (Single Ticket Ownership)**: An `ActionTaken` record belongs to exactly one `Ticket` (`ticketId` foreign key is required and immutable).
* **BR-02 (Separation of Ticket Coordinator and Action Performer)**: The `TicketOwner` coordinates the ticket as a whole, but individual Actions Taken may be performed or assigned to different IT Staff or Administrator members.
* **BR-03 (Authoritative Performer Attribution)**: The performer of an action (`performedById`) is automatically set by the server to the authenticated user ID. Client-supplied performer IDs are ignored.
* **BR-04 (Assignee Eligibility & Inactivity Rejection)**: If `assigneeId` is provided, the target user must have role `IT_STAFF` or `ADMINISTRATOR` and must have `isActive = true`. Assignment to inactive users or Requesters is rejected with `400 Bad Request` (`INVALID_ASSIGNEE`).
* **BR-05 (Requester Access Boundary & Privacy)**: Requesters have read-only access to Actions Taken on their owned tickets. Any write request (`POST`, `PATCH`, `DELETE`) by a Requester returns `403 Forbidden`. Attempting to read actions on unowned tickets returns `404 Not Found`.
* **BR-06 (Follow-Up Integrity & Resolution)**:
  * If `followUpRequired` is `true`, `followUpNote` must be provided, trimmed, and $\ge 5$ characters.
  * If `followUpRequired` is `false`, `followUpNote` must be null or empty.
  * Resolving a follow-up sets `followUpResolvedAt = now()`. It does NOT nullify `followUpNote`, preserving audit history.
* **BR-07 (Action Taken Status Model & Transitions)**:
  * Permitted action statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
  * `result` is required ($\ge 3$ characters) when status is set to `COMPLETED`.
  * Permitted action status transitions:
    * `PENDING` $\to$ `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
    * `IN_PROGRESS` $\to$ `COMPLETED`, `CANCELLED`
    * `COMPLETED` $\to$ `IN_PROGRESS` (if work is reopened)
    * `CANCELLED` $\to$ Terminal
  * Hard deletion is prohibited; cancellation is performed via status `CANCELLED`.

### Ticket Status & Workflow Rules
* **BR-08 (Permitted Ticket Status Transition & Authorization Matrix)**:
  | From Status | Permitted Next Status | Authorized Roles | Business Condition / Gate |
  | :--- | :--- | :--- | :--- |
  | `NEW` | `OPEN` | `IT_STAFF`, `ADMINISTRATOR` | IT Staff claims or begins triage. |
  | `NEW` | `CANCELLED` | `REQUESTER` (own), `IT_STAFF`, `ADMIN` | Requester withdraws request before work begins. |
  | `OPEN` | `IN_PROGRESS` | `IT_STAFF`, `ADMINISTRATOR` | Work actively underway. |
  | `OPEN` | `WAITING_FOR_REQUESTER` | `IT_STAFF`, `ADMINISTRATOR` | Requires user input or testing. |
  | `OPEN` | `RESOLVED` | `IT_STAFF`, `ADMINISTRATOR` | **Subject to Resolution Gate (BR-09)**. |
  | `OPEN` | `CANCELLED` | `IT_STAFF`, `ADMINISTRATOR` | Request deemed invalid or obsolete. |
  | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `IT_STAFF`, `ADMINISTRATOR` | Waiting for user feedback. |
  | `IN_PROGRESS` | `RESOLVED` | `IT_STAFF`, `ADMINISTRATOR` | **Subject to Resolution Gate (BR-09)**. |
  | `IN_PROGRESS` | `CANCELLED` | `IT_STAFF`, `ADMINISTRATOR` | Work stopped and cancelled. |
  | `WAITING_FOR_REQUESTER` | `IN_PROGRESS` | `IT_STAFF`, `ADMINISTRATOR` | Requester replied; work resumes. |
  | `WAITING_FOR_REQUESTER` | `OPEN` | `IT_STAFF`, `ADMINISTRATOR` | Returned to queue. |
  | `WAITING_FOR_REQUESTER` | `RESOLVED` | `IT_STAFF`, `ADMINISTRATOR` | **Subject to Resolution Gate (BR-09)**. |
  | `WAITING_FOR_REQUESTER` | `CANCELLED` | `IT_STAFF`, `ADMINISTRATOR` | Abandoned request. |
  | `RESOLVED` | `CLOSED` | `IT_STAFF`, `ADMINISTRATOR` | Final administrative closure. |
  | `RESOLVED` | `REOPENED` | `REQUESTER` (own), `IT_STAFF`, `ADMIN` | Issue recurred or resolution rejected. |
  | `CLOSED` | `REOPENED` | `IT_STAFF`, `ADMINISTRATOR` | Exceptional administrative reopen. |
  | `REOPENED` | `OPEN`, `IN_PROGRESS` | `IT_STAFF`, `ADMINISTRATOR` | Rework begins. |
  | `REOPENED` | `RESOLVED` | `IT_STAFF`, `ADMINISTRATOR` | **Subject to Resolution Gate (BR-09)**. |
  | `REOPENED` | `CANCELLED` | `IT_STAFF`, `ADMINISTRATOR` | Cancelled rework. |
  | `CANCELLED` | *(None)* | — | Terminal state; no transitions permitted. |

* **BR-09 (Authoritative Resolution Gate)**:
  A ticket cannot transition to `RESOLVED` (or directly from active states to `CLOSED`) unless all four criteria are satisfied:
  1. The ticket has $\ge 1$ associated `ActionTaken` record.
  2. Zero associated `ActionTaken` records have status $\in$ {`PENDING`, `IN_PROGRESS`}.
  3. Zero associated `ActionTaken` records have unresolved follow-up (`followUpRequired == true && followUpResolvedAt == null && status != CANCELLED`).
  4. The ticket has a valid, non-empty `resolutionSummary` ($\ge 5$ characters).
  *Violations return `400 Bad Request` with `RESOLUTION_GATE_BLOCKED` and a detailed array of all unmet items.*
  *Grandfathering*: Tickets already in `RESOLVED` or `CLOSED` status from prior labs may transition from `RESOLVED` $\to$ `CLOSED` without failing this gate.
* **BR-10 (Advisory Nature of Requester Resolution)**:
  A Requester setting `problemAppearsResolved = true` updates the audit flag and timestamp but does NOT change `currentStatus` or satisfy `BR-09`. IT Staff must review the work and formally resolve the ticket.
* **BR-11 (Optimistic Concurrency Control)**:
  Ticket and Action updates submit `expectedVersion` (or `expectedUpdatedAt`). If the database record version has advanced, the backend rejects the request with `409 Conflict` and returns the latest record state. Status transitions and gate checks run in an atomic database transaction.

### Dashboard Calculation Rules
* **Authoritative Timezone & Timestamp Standards**:
  * **Application Timezone**: `Asia/Bangkok` (UTC+07:00). All calendar date boundaries ("today", "yesterday", start-of-day) are evaluated in `Asia/Bangkok`.
  * **Wire Protocol Format**: All JSON timestamps are serialized as ISO 8601 UTC strings with millisecond precision (e.g. `2026-10-01T14:30:00.000Z`).
  * **"Today" Date Boundary**: From `00:00:00.000` to `23:59:59.999` `Asia/Bangkok` (converted to UTC equivalent for database SQL filtering).
  * **"Yesterday" Date Boundary**: From `00:00:00.000` to `23:59:59.999` `Asia/Bangkok` of the immediately preceding calendar day.
  * **"From Yesterday" Delta Calculation**:
    For each operational metric card on the IT Staff Dashboard, the system computes the change relative to yesterday:
    $$\Delta = \text{Count as of Today} - \text{Count as of Yesterday at same cutoff / end-of-day}$$
    Returned in the API as `deltaFromYesterday: number` (e.g. `+1`, `-2`, `0`). The UI displays this as:
    * Positive ($\Delta > 0$): `+N from yesterday` in emerald green (`#22543D`).
    * Negative ($\Delta < 0$): `-N from yesterday` in muted steel blue (`#2B6CB0`).
    * Zero ($\Delta = 0$): `0 from yesterday` in neutral gray (`#5C6F64`).
  * **"Recently Updated" Date Boundary**:
    `recentTickets` returns up to 5 tickets ordered by `updatedAt DESC` that were updated within the last 30 calendar days (`updatedAt >= now() - INTERVAL '30 days'` in `Asia/Bangkok`). If fewer than 5 tickets exist in the last 30 days, returns all available tickets up to 5.
  * **"Recently Resolved" Date Boundary**:
    `resolvedTickets` counts tickets where `currentStatus = 'RESOLVED'` and `resolvedAt >= now() - INTERVAL '30 days'` in `Asia/Bangkok`.

* **BR-12 (Requester Dashboard Metrics)**:
  Calculated across tickets where `requesterId = auth.userId`:
  * `myOpenTickets`: `currentStatus` $\in$ {`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`}.
  * `inProgressTickets`: `currentStatus = IN_PROGRESS`.
  * `resolvedTickets`: `currentStatus = RESOLVED` (resolved within the 30-day window).
  * `closedTickets`: `currentStatus = CLOSED`.
  * `waitingForRequesterTickets`: `currentStatus = WAITING_FOR_REQUESTER`.
  * `recentTickets`: Up to 5 tickets owned by user ordered by `updatedAt DESC` within 30 days. Empty array `[]` if none.
* **BR-13 (IT Staff Dashboard Metrics)**:
  Calculated across all tickets system-wide:
  * `newTickets`: `currentStatus = NEW` with `deltaFromYesterday`.
  * `openTickets`: `currentStatus = OPEN` with `deltaFromYesterday`.
  * `inProgressTickets`: `currentStatus = IN_PROGRESS` with `deltaFromYesterday`.
  * `waitingForRequesterTickets`: `currentStatus = WAITING_FOR_REQUESTER` with `deltaFromYesterday`.
  * `myAssignedTickets`: `ticketOwnerId = auth.userId` AND `currentStatus` NOT IN {`RESOLVED`, `CLOSED`, `CANCELLED`} with `deltaFromYesterday`.
  * `unassignedTickets`: `ticketOwnerId IS NULL` AND `currentStatus` NOT IN {`RESOLVED`, `CLOSED`, `CANCELLED`}.
  * `highUrgentTickets`: `itPriority` $\in$ {`HIGH`, `URGENT`} AND `currentStatus` NOT IN {`RESOLVED`, `CLOSED`, `CANCELLED`}.
  * `myOpenActionsCount`: Count of actions where (`performedById = auth.userId` OR `assigneeId = auth.userId`) AND `status` $\in$ {`PENDING`, `IN_PROGRESS`}.
  * `recentTickets`: Up to 5 tickets system-wide ordered by `updatedAt DESC` within 30 days.
* **BR-14 (Administrator Dashboard Metrics)**:
  Includes all IT Staff metrics from `BR-13`, plus user account statistics:
  * `totalUsers`: Count of all users.
  * `activeUsers`: Count of users with `isActive = true`.
  * `inactiveUsers`: Count of users with `isActive = false`.
  * `usersByRole`: Sub-counts for `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
* **BR-15 (Dashboard Drill-Down URL Mapping)**:
  * Staff:
    * `newTickets` $\to$ `/staff/queue?status=NEW`
    * `openTickets` $\to$ `/staff/queue?status=OPEN`
    * `inProgressTickets` $\to$ `/staff/queue?status=IN_PROGRESS`
    * `waitingForRequesterTickets` $\to$ `/staff/queue?status=WAITING_FOR_REQUESTER`
    * `myAssignedTickets` $\to$ `/staff/queue?ownerId=me`
    * `unassignedTickets` $\to$ `/staff/queue?ownerId=unassigned`
    * `highUrgentTickets` $\to$ `/staff/queue?itPriority=HIGH`
  * Requester:
    * `myOpenTickets` $\to$ `/my-tickets?status=OPEN`
    * `inProgressTickets` $\to$ `/my-tickets?status=IN_PROGRESS`
    * `resolvedTickets` $\to$ `/my-tickets?status=RESOLVED`
    * `closedTickets` $\to$ `/my-tickets?status=CLOSED`
* **BR-16 (Append-Only Actions & Stable Ordering)**:
  `ActionTaken` records are ordered by `actionDateTime ASC, id ASC`. When tickets enter terminal states (`CLOSED`, `CANCELLED`), actions can no longer be added or modified.

---

## 6. Authorization Matrix (Role × Endpoint × Ownership)

Every protected backend operation is governed by server-side role and ownership verification. Hiding UI controls is never considered authorization:

| Endpoint / Operation | HTTP Method | Requester (End User) | IT Staff | Administrator | Ownership / Boundary Check |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `POST /api/auth/login` | POST | Public | Public | Public | Only active accounts (`isActive = true`) |
| `POST /api/auth/logout` | POST | Authenticated | Authenticated | Authenticated | Invalidate token / session |
| `GET /api/auth/me` | GET | Authenticated | Authenticated | Authenticated | Returns own profile and role |
| `POST /api/auth/change-password` | POST | Authenticated | Authenticated | Authenticated | Complexity rules; `new !== current` |
| `GET /api/health` | GET | Public / All | Public / All | Public / All | Primary system liveness and DB connectivity probe |
| `GET /api/categories` | GET | Public / All | Public / All | Public / All | Reference category taxonomy data |
| `GET /api/related-systems` | GET | Public / All | Public / All | Public / All | Reference integration systems data |
| `POST /api/tickets` | POST | Allowed | **Forbidden (403)** | **Forbidden (403)** | Exclusively restricted to `REQUESTER` role; authenticated user recorded as `requesterId` |
| `GET /api/tickets/my-tickets` | GET | Owned Only | Owned Only | Owned Only | Strictly filtered to `requesterId = currentUser.id` |
| `GET /api/tickets/:id` | GET | Owned Only | Any Ticket | Any Ticket | Requester receives `404 Not Found` for unowned tickets to prevent leaking ticket existence |
| `POST /api/tickets/:id/attachments` | POST | Owned Only | Any Ticket | Any Ticket | Cap of 5 active attachments per ticket enforced |
| `GET /api/attachments/:id` | GET | Owned Only | Any Ticket | Any Ticket | Attachment metadata lookup |
| `GET /api/attachments/:id/download` | GET | Owned Only | Any Ticket | Any Ticket | Blocked if `isRemoved = true` (`410 Gone`) |
| `PATCH /api/attachments/:id/soft-remove` | PATCH | Owned Only | Any Ticket | Any Ticket | Requires `removedReason` ($\ge 3$ chars) |
| `GET /api/tickets/:id/comments` | GET | Owned Only | Any Ticket | Any Ticket | Public comments stream |
| `POST /api/tickets/:id/comments` | POST | Owned Only | Any Ticket | Any Ticket | Append-only public communication |
| `GET /api/tickets/:id/notes` | GET | **Forbidden (403)** | Allowed | Allowed | Requesters blocked without note disclosure |
| `POST /api/tickets/:id/notes` | POST | **Forbidden (403)** | Allowed | Allowed | Append-only internal operational notes |
| `GET /api/staff/tickets` | GET | **Forbidden (403)** | Allowed | Allowed | Shared Ticket Queue with filters & pagination |
| `PATCH /api/staff/tickets/:id/claim` | PATCH | **Forbidden (403)** | Allowed | Allowed | Claim unassigned ticket (`ticketOwnerId = auth.userId`) |
| `PATCH /api/staff/tickets/:id/assign` | PATCH | **Forbidden (403)** | Allowed | Allowed | Assign ticket to active IT Staff or Administrator account |
| `PATCH /api/staff/tickets/:id/priority` | PATCH | **Forbidden (403)** | Allowed | Allowed | Modifies `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) |
| `PATCH /api/staff/tickets/:id/status` (Active transitions) | PATCH | **Forbidden (403)** | Allowed | Allowed | Enforces approved lifecycle transition matrix (`BR-08`) |
| `PATCH /api/staff/tickets/:id/status` (Resolve ticket) | PATCH | **Forbidden (403)** | Allowed (Subject to Gate) | Allowed (Subject to Gate) | **Enforces Resolution Gate (BR-09)** ($\ge 1$ action, 0 incomplete, 0 open follow-ups, non-empty summary) |
| `POST /api/tickets/:id/indicate-resolved` | POST | Owned Only | **Forbidden (403)** | **Forbidden (403)** | Advisory; stamps flag/timestamp and logs audit comment. Does NOT advance status or satisfy Resolution Gate |
| `PATCH /api/tickets/:id/reopen` | PATCH | Owned Only (RESOLVED) | Allowed | Allowed | Requesters may reopen owned resolved tickets; Staff/Admin can reopen resolved or closed tickets |
| `PATCH /api/tickets/:id/cancel` | PATCH | Owned Only (NEW) | Allowed | Allowed | Requesters can only cancel owned tickets while still `NEW`; Staff/Admin can cancel active tickets |
| `GET /api/tickets/:id/actions` | GET | Owned Only (Read-Only) | Any Ticket | Any Ticket | Chronological order (`actionDateTime ASC, id ASC`); staff emails hidden for Requesters; unowned returns `404 Not Found` |
| `POST /api/tickets/:id/actions` | POST | **Forbidden (403)** | Allowed | Allowed | Auto-assigns `performedById = auth.userId`; active assignee check; duplicate check via `clientActionId`; closed/cancelled tickets blocked (`400 Bad Request`) |
| `PATCH /api/tickets/:id/actions/:actionId` | PATCH | **Forbidden (403)** | Allowed | Allowed | Updates description, status, or assignee; optimistic concurrency check (`expectedVersion`); closed/cancelled tickets blocked (`400 Bad Request`) |
| `PATCH /api/tickets/:id/actions/:actionId` (`resolveFollowUp: true`) | PATCH | **Forbidden (403)** | Allowed | Allowed | Stamps `followUpResolvedAt = now()`; preserves historical `followUpNote` |
| `POST /api/tickets/:id/actions/:actionId/cancel` | POST | **Forbidden (403)** | Allowed | Allowed | Sets status to `CANCELLED` with audit reason; hard deletion strictly prohibited |
| `GET /api/dashboard/requester` | GET | Allowed (Owned Only) | Allowed (Personal) | Allowed (Personal) | Summarizes metrics and recent tickets strictly for authenticated user's owned requests |
| `GET /api/dashboard/staff` | GET | **Forbidden (403)** | Allowed | Allowed | Shared operational metrics, velocity deltas (`deltaFromYesterday`), and open actions count |
| `GET /api/dashboard/admin` | GET | **Forbidden (403)** | **Forbidden (403)** | Allowed | Combines IT Staff operational queue metrics with user account summary metrics |
| `GET /api/admin/users` | GET | **Forbidden (403)** | **Forbidden (403)** | Allowed | User list with search & role filters |
| `POST /api/admin/users` | POST | **Forbidden (403)** | **Forbidden (403)** | Allowed | Create user with initial password (`mustChangePassword = true`) |
| `PATCH /api/admin/users/:id` | PATCH | **Forbidden (403)** | **Forbidden (403)** | Allowed | Edit user details; blocks self-deactivation and last active admin demotion/deactivation |
| `POST /api/admin/users/:id/reset-password` | POST | **Forbidden (403)** | **Forbidden (403)** | Allowed | Sets new initial password; resets `mustChangePassword = true` |

---

## 7. UI Specification Summary

The UI strictly adheres to the **Zen Green Design System**:
1. **Application Shell (`AppHeader.tsx`)**:
   * Introduces canonical *Dashboard* link across all roles (`/dashboard` for Requester, `/staff/dashboard` for IT Staff, `/admin/dashboard` for Admin).
   * Active tab high-contrast indicator (`border-bottom: 3px solid #FFFFFF`).
2. **IT Staff Dashboard (`StaffDashboard.tsx`)**:
   * Welcome banner: "Welcome back, {User Name}!" with `↻ Refresh` button.
   * 5 primary metric cards (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`), unassigned / priority alerts, and `My Open Actions` badge.
   * Split content: "My Recent Tickets" table on left; "Quick Actions" panel on right (`Create Ticket`, `Search Tickets`, `My Queue`, `Unassigned Queue`).
3. **Requester Dashboard (`RequesterDashboard.tsx`)**:
   * Welcome banner: "Welcome, {User Name}!".
   * 4 metric cards (`My Open`, `In Progress`, `Resolved`, `Closed`), and alert banner when tickets are waiting for requester response.
   * Split content: "My Recent Tickets" table and "Quick Actions" panel (`Create Ticket`, `View My Tickets`).
4. **Actions Taken on Ticket Detail (`ActionsTakenSection.tsx`)**:
   * Displayed in tabbed workspace with count: `Actions Taken (N)`.
   * Displays Action Date/Time, Description, Result, Performer badge, Assignee badge, Status badge, Follow-Up pill with expandable note, and Attachment Notes.
   * Create/Edit modal with active assignee select, conditional follow-up note input, and double-click protection.
   * Requester mode is strictly read-only.
5. **Resolution Gate Modal (`ResolutionGateModal.tsx`)**:
   * Resolve button opens modal prompting for `resolutionSummary`.
   * Evaluates gate criteria and dynamically lists all passing/failing conditions with specific action IDs.
   * Submit disabled until all criteria are satisfied.
6. **Optimistic Concurrency Modal**:
   * Alerts user upon `409 Conflict`, retains entered form data, and offers "Reload Latest" comparison.

---

## 8. Data Changes (Prisma Schema Design)

### 8.1. New Enums and Models

1. **New Enum `ActionStatus`**:
   ```prisma
   enum ActionStatus {
     PENDING
     IN_PROGRESS
     COMPLETED
     CANCELLED
   }
   ```

2. **New Model `ActionTaken`**:
   ```prisma
   model ActionTaken {
     id                 Int          @id @default(autoincrement())
     ticketId           Int
     performedById      Int
     assigneeId         Int?
     actionDateTime     DateTime     @default(now())
     actionDescription  String       @db.VarChar(2000)
     result             String?      @db.VarChar(2000)
     status             ActionStatus @default(COMPLETED)
     followUpRequired   Boolean      @default(false)
     followUpNote       String?      @db.VarChar(2000)
     followUpResolvedAt DateTime?
     attachmentNotes    String?      @db.VarChar(1000)
     version            Int          @default(1)
     createdAt          DateTime     @default(now())
     updatedAt          DateTime     @updatedAt

     ticket             Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)
     performedBy        User         @relation("ActionPerformer", fields: [performedById], references: [id])
     assignee           User?        @relation("ActionAssignee", fields: [assigneeId], references: [id])

     @@index([ticketId, actionDateTime])
     @@index([ticketId, status])
     @@index([performedById])
     @@index([assigneeId])
   }
   ```

3. **Additive Updates to Existing Models**:
   * `Ticket`:
     * Add `resolvedAt DateTime?` (records official resolution timestamp, avoiding reliance on `updatedAt`).
     * Add `version Int @default(1)` (for integer-based optimistic concurrency control).
     * Add `actionsTaken ActionTaken[]` relation.
     * Verified existing indexes: `@@index([currentStatus])`, `@@index([ticketOwnerId])`, `@@index([updatedAt])`, `@@index([itPriority])`.
   * `User`:
     * Add relations: `performedActions ActionTaken[] @relation("ActionPerformer")`, `assignedActions ActionTaken[] @relation("ActionAssignee")`.

### 8.2. Database Design Justifications
1. **Explicit Dual User Attribution on ActionTaken (`performedBy` vs `assignee`)**:
   * *Justification*: In service desk operations, the technician diagnosing an issue (`performedById`, auto-captured) may delegate a follow-up action to another staff specialist (`assigneeId`). Decoupling these fields guarantees tamper-proof auditability of who logged the record while providing operational flexibility to assign accountability for open tasks.
2. **Dedicated `followUpResolvedAt` Timestamp**:
   * *Justification*: Storing a resolution timestamp when a follow-up is satisfied allows the Resolution Gate to cleanly verify whether follow-ups remain open without destroying the historical `followUpNote`. Nullifying the note upon resolution would erase critical diagnostic notes.
3. **Dedicated `resolvedAt` on Ticket**:
   * *Justification*: Using `updatedAt` for the "recently resolved" dashboard metric is fragile because subsequent comments, notes, or attachment additions modify `updatedAt`. Storing an immutable `resolvedAt` timestamp ensures accurate 30-day resolution reporting.
4. **Composite Index `[ticketId, status]` and `[ticketId, actionDateTime]`**:
   * *Justification*: The Resolution Gate executes `COUNT` and status checks on actions belonging to a single ticket. The `[ticketId, status]` index allows the database to check for pending or in-progress actions with an index scan rather than a full table scan.

### 8.3. Migration & Backfill Strategy
* Migration name: `20261001_actions_taken_and_dashboards`.
* Purely additive: creates `ActionStatus` enum, creates `ActionTaken` table, and adds `resolvedAt` and `version` columns to `Ticket`.
* Existing tickets and attachments from Labs 1–3 remain untouched.
* Legacy tickets in `RESOLVED` or `CLOSED` status have `resolvedAt` backfilled to their `updatedAt` value.
* Rollback: Dropping `ActionTaken` table and removing added columns fully restores the Lab 3 schema.

### 8.4. Seed Data Idempotency
* `server/prisma/seed.ts` is updated to seed realistic Actions Taken.
* To guarantee 100% idempotency without natural keys, seed entries query existing tickets by `ticketNumber` and check whether actions exist before inserting.
* Seeds cover:
  * Ticket with 0 actions (proves Resolution Gate block).
  * Ticket with 1 action (`COMPLETED`, no follow-up).
  * Ticket with multiple actions across different performers and assignees.
  * Ticket with action having unresolved follow-up (`followUpRequired: true, followUpResolvedAt: null`).
  * Requester with zero tickets (proves empty dashboard state).
  * Inactive IT Staff member (proves assignee rejection).

---

## 9. API Contract Summary

1. **Actions Taken Endpoints**:
   * `GET /api/tickets/:id/actions`: Returns actions for ticket (stable order: `actionDateTime ASC, id ASC`).
   * `POST /api/tickets/:id/actions`: Creates action (IT Staff/Admin only; auto-performer; active assignee validation; duplicate protection).
   * `PATCH /api/tickets/:id/actions/:actionId`: Updates action, transitions status, or marks follow-up resolved (optimistic concurrency via `expectedVersion`).
2. **Dashboard Endpoints**:
   * `GET /api/dashboard/requester`: Returns `myOpenTickets`, `inProgressTickets`, `resolvedTickets`, `closedTickets`, `waitingForRequesterTickets`, and `recentTickets`.
   * `GET /api/dashboard/staff`: Returns `newTickets`, `openTickets`, `inProgressTickets`, `waitingForRequesterTickets`, `myAssignedTickets`, `unassignedTickets`, `highUrgentTickets`, `myOpenActionsCount`, and `recentTickets`.
   * `GET /api/dashboard/admin`: Extends staff metrics with `totalUsers`, `activeUsers`, `inactiveUsers`, and `usersByRole`.
3. **Workflow & Status Updates**:
   * `PATCH /api/staff/tickets/:id/status`: Enforces Resolution Gate and atomic concurrency lock.
   * `POST /api/tickets/:id/indicate-resolved`: Requester advisory resolution indication.

*(Full schemas, parameter validations, and responses are detailed in `docs/lab-04/api-spec.md`)*.

---

## 10. Acceptance Criteria (Given-When-Then)

* **AC-01 (Valid Action Taken Creation)**:
  * *Given* an authenticated IT Staff or Administrator user and valid action payload,
  * *When* `POST /api/tickets/:id/actions` is executed,
  * *Then* the action is saved under the ticket, `performedById` is automatically set to the authenticated user ID, and `201 Created` is returned.
* **AC-02 (Inactive Assignee Rejection)**:
  * *Given* an authenticated IT Staff user,
  * *When* creating or updating an Action Taken with an `assigneeId` belonging to an inactive user or a Requester,
  * *Then* the request is rejected with `400 Bad Request` (`INVALID_ASSIGNEE`).
* **AC-03 (Follow-Up Note Validation & Resolution)**:
  * *Given* an Action Taken with `followUpRequired = true`,
  * *When* submitted without `followUpNote`, then `400 Bad Request` is returned;
  * *When* follow-up is subsequently marked resolved, `followUpResolvedAt` is recorded while preserving `followUpNote`.
* **AC-04 (Requester Actions Taken View)**:
  * *Given* an authenticated Requester viewing an owned ticket,
  * *When* retrieving Actions Taken,
  * *Then* all action lines for that ticket are returned in read-only format without exposing staff emails.
* **AC-05 (Requester Actions Taken Write Prohibition)**:
  * *Given* an authenticated Requester,
  * *When* attempting to `POST`, `PATCH`, or `DELETE` an Action Taken,
  * *Then* the request is rejected with `403 Forbidden`.
* **AC-06 (Unowned Ticket Action Isolation)**:
  * *Given* an authenticated Requester,
  * *When* requesting actions for a ticket owned by another user,
  * *Then* the backend returns `404 Not Found` without leaking ticket existence.
* **AC-07 (Resolution Gate - Zero Actions Taken)**:
  * *Given* an open ticket with zero Actions Taken records,
  * *When* IT Staff attempts to transition status to `RESOLVED`,
  * *Then* the transition is rejected with `400 Bad Request` (`RESOLUTION_GATE_BLOCKED`) citing missing actions.
* **AC-08 (Resolution Gate - Incomplete Actions & Unresolved Follow-Up)**:
  * *Given* a ticket with an Action Taken having status `IN_PROGRESS` or `followUpRequired = true && followUpResolvedAt = null`,
  * *When* IT Staff attempts to transition status to `RESOLVED`,
  * *Then* the transition is rejected with `400 Bad Request` (`RESOLUTION_GATE_BLOCKED`) listing the blocking action IDs.
* **AC-09 (Resolution Gate - Missing Resolution Summary)**:
  * *Given* a ticket with all actions completed and follow-ups resolved,
  * *When* IT Staff attempts to transition status to `RESOLVED` without `resolutionSummary`,
  * *Then* the transition is rejected with `400 Bad Request` requiring a non-empty summary.
* **AC-10 (Resolution Gate - Successful Resolution)**:
  * *Given* a ticket with completed actions, all follow-ups resolved, and a valid `resolutionSummary`,
  * *When* IT Staff transitions status to `RESOLVED`,
  * *Then* status updates to `RESOLVED`, `resolvedAt` is stamped, and `200 OK` is returned.
* **AC-11 (Requester Advisory Resolution)**:
  * *Given* an authenticated Requester viewing an owned open ticket,
  * *When* executing `POST /api/tickets/:id/indicate-resolved`,
  * *Then* `problemAppearsResolved = true` is recorded, but `currentStatus` remains unchanged.
* **AC-12 (Optimistic Concurrency Conflict Handling)**:
  * *Given* a client submitting a ticket or action update with a stale `expectedVersion`,
  * *When* the record has already been modified in the database,
  * *Then* the backend returns `409 Conflict` with the latest record state.
* **AC-13 (Requester Dashboard Metrics & Isolation)**:
  * *Given* an authenticated Requester,
  * *When* requesting `GET /api/dashboard/requester`,
  * *Then* only metrics (`myOpenTickets`, `inProgressTickets`, `resolvedTickets`, `closedTickets`, `waitingForRequesterTickets`) and recent tickets owned by that Requester are returned.
* **AC-14 (IT Staff Dashboard Operational Metrics)**:
  * *Given* an authenticated IT Staff user,
  * *When* requesting `GET /api/dashboard/staff`,
  * *Then* system-wide operational counts and `myOpenActionsCount` are returned.
* **AC-15 (Administrator Dashboard User Metrics)**:
  * *Given* an authenticated Administrator,
  * *When* requesting `GET /api/dashboard/admin`,
  * *Then* both IT Staff operational metrics and user-account counts (`totalUsers`, `activeUsers`, `inactiveUsers`, `usersByRole`) are returned.
* **AC-16 (Dashboard Drill-Down Navigation)**:
  * *Given* a user viewing their respective dashboard,
  * *When* clicking on any metric card,
  * *Then* the UI navigates to the ticket queue or my tickets list with corresponding query filters pre-populated.
* **AC-17 (Locked Terminal Tickets)**:
  * *Given* a ticket in status `CLOSED` or `CANCELLED`,
  * *When* attempting to add or modify an Action Taken,
  * *Then* the operation is rejected with `400 Bad Request`.
* **AC-18 (Double-Click Submission Protection)**:
  * *Given* an in-flight network request on an action or status form,
  * *When* submit controls are active,
  * *Then* the buttons are disabled with spinner states, preventing duplicate submissions.
* **AC-19 (Database Migration & Idempotent Seed)**:
  * *Given* the database schema,
  * *When* running `prisma migrate dev` and `npm run prisma:seed` repeatedly,
  * *Then* all migrations apply non-destructively and no duplicate seed records are created.
* **AC-20 (Full System Regression)**:
  * *Given* the upgraded Lab 4 application,
  * *When* running all previous test suites for Labs 1, 2, and 3,
  * *Then* 100% of the regression tests pass without errors or regressions.

---

## 11. Product Definition of Done (DoD)

Before the Lab 4 increment is declared complete:
1. **Scope & Code Completeness**:
   * Actions Taken data model, migration, seed, APIs, and UI are fully functional.
   * Ticket Status Transition Matrix and Resolution Gate are strictly enforced on backend and guided in UI.
   * Role-specific Dashboards for Requesters, IT Staff, and Administrators are live with accurate metrics.
   * Concurrency control via versioning handles collisions with `409 Conflict`.
2. **Testing & Quality Assurance**:
   * All Unit, API, UI, and E2E tests are implemented and passing in `server/tests/lab-04/`, `client/tests/lab-04/`, and `e2e/lab-04/`.
   * Complete regression test suites from Labs 1, 2, and 3 pass in full.
   * Zero skipped, ignored, or flaky tests.
3. **UI, Accessibility & Zen Green Compliance**:
   * Verified on Desktop ($\ge 992\text{px}$), Tablet ($768 - 991\text{px}$), and Mobile ($< 768\text{px}$).
   * No horizontal window scrolling; table scrolls encapsulated within container.
   * Form inputs preserve state on recoverable API failures.
   * Complete 4-state UI feedback implemented: loading skeletons, zero-count empty states, 403 forbidden state, and safe API failure recovery.
   * All console errors, broken links, placeholder text, unfinished controls, and duplicate/obsolete UI elements from earlier labs are completely removed.
4. **Documentation, Repository Integrity & Traceability**:
   * `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` are completely aligned with 100% bi-directional traceability.
   * Root and module `README.md` setup, seed, migration, test, and demonstration instructions are verified, fully working, and current.
   * Screenshots captured and placed in `artifacts/lab-04/screenshots/`.

---

## 12. Assumptions and Decisions

1. **Performer vs Assignee Distinction**:
   * *Decision*: An Action Taken records `performedById` as the creator/performer automatically from the JWT token, and optionally supports an `assigneeId` for tasks delegated to another staff member.
2. **Follow-Up Resolution Lifecycle**:
   * *Decision*: Follow-up completion is tracked via `followUpResolvedAt: DateTime?`. Setting this timestamp satisfies the Resolution Gate while preserving `followUpNote` for historical audit.
3. **Resolution Gate Criteria**:
   * *Decision*: Transitioning to `RESOLVED` requires $\ge 1$ action taken, zero incomplete actions (`PENDING`/`IN_PROGRESS`), zero unresolved follow-ups, and a non-empty `resolutionSummary`. Legacy closed tickets are grandfathered.
4. **Optimistic Concurrency Strategy**:
   * *Decision*: Integer `version` column on `Ticket` and `ActionTaken` eliminates JSON timestamp precision discrepancies and guarantees atomic conflict detection.
5. **Dashboard Metrics Alignment**:
   * *Decision*: Requester metrics match the handout mockup (`myOpenTickets`, `inProgressTickets`, `resolvedTickets`, `closedTickets`) with a `waitingForRequesterTickets` attention banner. IT Staff dashboard includes `myOpenActionsCount` to satisfy the Part 5 grading rubric.
