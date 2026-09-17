# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a robust, responsive, and secure Requester-facing MVP for TokTickIT using the Zen Green design system. This increment enables Requesters (simulated via a Development Requester selector) to create IT support tickets with file attachments, receive backend-generated unique ticket numbers, view and manage their own tickets in a searchable and paginated dashboard, inspect ticket details, add attachments, and soft-remove attachments with recorded reasons, all while enforcing strict multi-requester ownership boundaries.

---

## 2. Stakeholder Request Interpretation
The IT department requires a functional, self-service ticketing portal where end users (Requesters) can submit IT issues across categories (Account and Access, Hardware, Software, Network) and related systems, attach relevant supporting evidence (screenshots, logs, PDFs), and track their tickets. Because full authentication and IT Staff queues are deferred to Lab 3 and Lab 4, this sprint implements a simulated "Development Requester" testing context to ensure multi-user ticket ownership, isolation, and data integrity from day one. The user interface must adhere strictly to the Zen Green design tokens and maintain consistent responsive behavior across mobile, tablet, and desktop viewports.

---

## 3. Scope

### Included
1. **Development Requester Testing Context**:
   - Database model and seed data for active and inactive Requesters.
   - Development Requester selection screen and header context indicator with "Change Requester" capability.
   - Session-level context persistence in the client (`localStorage` + React state).
2. **Create Ticket Workflow**:
   - Ticket creation form capturing Category, Related System, Requested Priority, Summary, Description, and initial Attachments.
   - Comprehensive frontend and backend validation with field-level feedback and error state data preservation.
   - Backend generation of unique official Ticket Numbers (`TKT-YYYY-XXXXXX`).
   - Initial status default to `NEW`.
3. **My Tickets Dashboard**:
   - Requester-isolated ticket listing with search (keyword and ticket number), multi-criteria filtering (Category, Priority, Status), and sorting.
   - Server-side pagination with controls and indicators.
   - Distinct empty state (no tickets yet) and no-results state (filters returned zero matches).
4. **Requester Ticket Detail View**:
   - Read-only display of ticket header metadata.
   - Strict backend ownership validation preventing access to tickets owned by other Requesters.
5. **Attachment Lifecycle Management**:
   - Upload support for allowed MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) between 1 byte and 5 MB per file.
   - Maximum limit of 5 active attachments per ticket.
   - Adding new attachments to existing tickets.
   - Secure file download for active attachments.
   - Soft-removal of attachments with user confirmation and recorded removal reason (preserving metadata while blocking binary download/preview).
6. **UI Foundation & Responsive Design**:
   - Zen Green design tokens, button hierarchy, component states, and responsive layouts (desktop ≥992px, tablet 768–991px, mobile <768px).

### Excluded
1. **Authentication & Security Infrastructure**: Real login/logout, password hashing (bcrypt/argon2), user registration, session tokens/JWTs, and real RBAC (deferred to Lab 3).
2. **IT Staff Workflow**: IT Staff dashboard/queues, claiming or reassigning tickets, setting IT Priority, or internal notes (deferred to Lab 3/4).
3. **Ticket Collaboration**: Public Comments, Internal Notes, and Actions Taken / Event Logs.
4. **Ticket Lifecycle Transitions After Creation**: Changing status beyond `NEW` (e.g. In Progress, Resolved, Closed, Reopened, Cancelled), resolution summaries, or confirmation of resolution.
5. **Admin Management**: Management of users, roles, categories, or system reference data.

---

## 4. Functional Requirements

* **FR-01 (Requester Context Selection)**: The system shall provide a Development Requester selector displaying only active Requesters loaded from the database. Selecting a Requester establishes the active context for all subsequent ticket operations.
* **FR-02 (Context Switching & Shell Display)**: The application shell shall display the active Requester's name and provide a "Change Requester" action. Switching Requesters shall immediately reload all requester-dependent data and redirect away from any unowned Ticket Detail screen.
* **FR-03 (Reference Data Retrieval)**: The system shall load active Categories and Related Systems from the database to populate dropdown selectors on the Create Ticket screen.
* **FR-04 (Ticket Creation)**: The system shall allow a Requester to submit a new ticket containing Category, Related System, Requested Priority, Summary, Description, and up to 5 valid attachments.
* **FR-05 (Ticket Number Generation)**: Upon successful creation, the backend shall generate and assign a unique official Ticket Number conforming to `TKT-YYYY-XXXXXX` using a concurrency-safe sequential mechanism.
* **FR-06 (Form Validation & Feedback)**: The frontend and backend shall validate all required fields and lengths. Inline validation errors shall appear directly under invalid fields. If submission fails, entered data shall remain preserved in the form.
* **FR-07 (Duplicate Submission Guard)**: The submission button shall display a loading/busy state and become disabled during submission to prevent duplicate records.
* **FR-08 (My Tickets List Retrieval)**: The system shall provide a list of tickets belonging strictly to the active Requester, displaying Ticket Number, Summary, Category, Requested Priority, IT Priority, Current Status, and Created/Updated timestamps.
* **FR-09 (Ticket Search & Filtering)**: The My Tickets view shall support keyword search across summary and ticket number, as well as filtering by Category, Requested Priority, and Status with safe SQL query escaping.
* **FR-10 (Ticket List Sorting & Pagination)**: The My Tickets API shall support sorting by date, priority, or status, and deliver paginated results with page numbers, page size, and total count metadata.
* **FR-11 (Requester Ticket Detail Inspection)**: The system shall display the full details of a specific ticket in read-only format when requested by its owner.
* **FR-12 (Ownership Protection)**: The backend shall reject any attempt to view, modify, or download tickets and attachments belonging to a different Requester with an HTTP 403 Forbidden or 404 Not Found.
* **FR-13 (Attachment Upload & Validation)**: The system shall validate attachments against allowed file types (`JPG`, `PNG`, `WEBP`, `PDF`) and size limits (> 0 bytes and ≤ 5 MB), enforcing a cap of 5 active attachments per ticket.
* **FR-14 (Attachment Addition to Existing Ticket)**: An authorized Requester shall be able to upload additional attachments to an existing ticket up to the active attachment limit.
* **FR-15 (Attachment Download)**: The system shall allow authorized Requesters to download active (non-removed) attachments.
* **FR-16 (Attachment Soft Removal)**: An authorized Requester shall be able to soft-remove an attachment by providing a confirmation and removal reason (min 3 chars). The file metadata shall remain visible with a "Removed" tag, while file binary access is permanently blocked.

---

## 5. Business Rules

| Rule ID | Category | Business Rule Description |
| :--- | :--- | :--- |
| **BR-01** | System Identifiers | The official Ticket Number is generated exclusively by the backend inside a safe transaction and must be globally unique formatted as `TKT-YYYY-XXXXXX` (where YYYY is the creation year and XXXXXX is a sequential zero-padded integer). |
| **BR-02** | Ticket Lifecycle | Every newly created Ticket automatically starts with `currentStatus = 'NEW'`. Status transitions beyond `NEW` are prohibited in Lab 2. |
| **BR-03** | Testing Identity | Lab 2 uses a Development Requester selector in place of authentication. This identity is strictly for local testing context and does not constitute secure authentication. |
| **BR-04** | Requester Eligibility | Only active Requesters (`isActive = true`) can be selected in the UI and create tickets. If an API request references an inactive `requesterId`, it must be rejected with HTTP 400 Bad Request. |
| **BR-05** | Ownership Boundary | A Requester has access exclusively to tickets and attachments they created (`requesterId` match). Cross-requester queries or direct ID access attempts must be rejected with HTTP 403 Forbidden or 404 Not Found. |
| **BR-06** | Ticket Field Limits | • **Summary**: Required string, 5 to 100 characters (after whitespace trimming).<br>• **Description**: Required string, 10 to 2000 characters (after whitespace trimming).<br>• **Category**: Required valid foreign key reference to an active Category.<br>• **Related System**: Required valid foreign key reference to an active Related System.<br>• **Requested Priority**: Required enum value (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). Defaults to `MEDIUM`.<br>• **IT Priority**: Defaults to match `requestedPriority` upon creation (read-only for Requester). |
| **BR-07** | Data Retention on Error | In the event of client-side validation failure, API 4xx/5xx responses, or network failure, all entered form fields and attached file selections must remain preserved in the UI. |
| **BR-08** | Duplicate Prevention | The form submission control must immediately enter a disabled/busy state upon initial click and remain disabled until the server responds or a timeout occurs. |
| **BR-09** | Attachment Formats & Size | Permitted file extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`. Permitted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. File size must be > 0 bytes and ≤ 5,242,880 bytes (5 MB) per file. Empty (0-byte) files are strictly rejected. |
| **BR-10** | Active Attachment Cap | A ticket may contain a maximum of 5 active (non-removed) attachments. Soft-removed attachments do not count toward this 5-file cap. If 5 active attachments exist, further uploads must be disabled and rejected by the API with HTTP 400. |
| **BR-11** | Soft Removal Policy | Attachments cannot be permanently deleted from the database in Lab 2. Removal sets `isRemoved = true`, records the required `removedReason` (3–255 characters), and captures `removedAt = NOW()`. |
| **BR-12** | Removed Attachment Access | Soft-removed attachments remain listed in the ticket's attachment table/list with visual removal indicators and removal reasons, but file download and preview operations must return HTTP 410 Gone or 404 Not Found. |
| **BR-13** | Storage & Atomic Safety | Uploaded files must be stored on disk with unique sanitized storage names (e.g. UUID-based) to prevent path traversal or collision. If ticket creation fails midway, temporary uploaded files must be cleaned up to prevent orphaned disk files. |
| **BR-14** | Default List Ordering & Pagination Edge Cases | The My Tickets list defaults to sorting by `createdAt` descending (`DESC`), with secondary sort by `id DESC`. Requesting a page beyond `totalPages` returns an empty array `data: []` with accurate pagination metadata rather than an error. Page sizes are clamped between 1 and 50. |
| **BR-15** | Read-Only Detail Header | In Requester Ticket Detail view, all ticket header attributes (Ticket Number, Requester, Category, Related System, Summary, Description, Priority, Status, Timestamps) are strictly read-only. |

---

## 6. UI Specification Summary
The UI adheres strictly to the **Zen Green Design System** detailed in `docs/lab-02/ui-spec.md`. Key elements include:
* **Color Tokens**: Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Page Background (`#F5F7F6`), Surface Cards (`#FFFFFF`), Text (`#1C2A22`), Borders (`#D8E2DC`), Error (`#C53030`), Warning (`#DD6B20`), Success (`#22543D`).
* **Application Shell**: Top navigation bar displaying TokTickIT brand, navigation links (*My Tickets*, *Create Ticket*), active Requester badge, and a *Change Requester* button.
* **Development Requester Selector**: Card modal/page allowing selection of active Requesters with informational banner explaining this is a Lab 2 test tool.
* **Create Ticket Screen**: Responsive form layout with distinct editable white fields, required asterisks (`*`), character counters, inline field error messages, file drag-and-drop/upload zone, and Primary submit button with busy spinner.
* **My Tickets Screen**: Search bar, dropdown filter toolbar (Category, Priority, Status), sortable data table (desktop) / responsive cards (mobile), pagination footer, and clear empty/no-results states.
* **Ticket Detail Screen**: Two-column summary card with read-only ivory/gray-green styling, status badges, and an Attachments card supporting file addition, download buttons, and soft-remove modals with reason input.

---

## 7. Data Changes (Prisma Schema Design)

### 7.1. Entity Relationship Model
```
+-------------------+        1:N        +-------------------+
|   RequesterUser   | ----------------< |      Ticket       |
+-------------------+                   +-------------------+
                                          | 1:N           | 1:N
                                          |               |
                                          v               v
+-------------------+           +-------------------+   +-------------------+
|     Category      |           |    Attachment     |   |   RelatedSystem   |
+-------------------+           +-------------------+   +-------------------+
```

### 7.2. Prisma Models Specification
```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  PENDING
  RESOLVED
  CLOSED
}

model RequesterUser {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  tickets    Ticket[]

  @@index([isActive])
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  tickets   Ticket[]

  @@index([isActive])
}

model Ticket {
  id                 Int           @id @default(autoincrement())
  ticketNumber       String        @unique
  requesterId        Int
  categoryId         Int
  relatedSystemId    Int
  summary            String        @db.VarChar(100)
  description        String        @db.VarChar(2000)
  requestedPriority  Priority      @default(MEDIUM)
  itPriority         Priority      @default(MEDIUM)
  currentStatus      TicketStatus  @default(NEW)
  ticketOwnerId      Int?
  resolutionSummary  String?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  requester          RequesterUser @relation(fields: [requesterId], references: [id])
  category           Category      @relation(fields: [categoryId], references: [id])
  relatedSystem      RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  attachments        Attachment[]

  @@index([requesterId, createdAt])
  @@index([currentStatus])
  @@index([ticketNumber])
}

model Attachment {
  id            Int       @id @default(autoincrement())
  ticketId      Int
  fileName      String    // UUID sanitized storage file name
  originalName  String    // Original uploaded file name
  fileSize      Int       // Size in bytes
  mimeType      String    // MIME type string
  storagePath   String    // Relative disk storage path
  isRemoved     Boolean   @default(false)
  removedReason String?
  removedAt     DateTime?
  uploadedAt    DateTime  @default(now())

  ticket        Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, isRemoved])
}
```

### 7.3. Required Seed Data
* **Categories (4)**: `Account and Access`, `Hardware`, `Software`, `Network`.
* **Related Systems (7)**: `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
* **Development Requesters (5)**:
  * `Jennifer Anderson` (`jennifer.anderson@kmutt.ac.th`, Dept: `Computer Engineering`, `isActive: true`)
  * `David Lee` (`david.lee@kmutt.ac.th`, Dept: `Information Technology`, `isActive: true`)
  * `Sarah Johnson` (`sarah.johnson@kmutt.ac.th`, Dept: `Digital Media`, `isActive: true`)
  * `Michael Brown` (`michael.brown@kmutt.ac.th`, Dept: `Electrical Engineering`, `isActive: true`)
  * `Alex Inactive` (`alex.inactive@kmutt.ac.th`, Dept: `General Studies`, `isActive: false`)

---

## 8. API Contract Summary
Refer to `docs/lab-02/api-spec.md` for full schema specifications.
* `GET /api/requesters` — Retrieve active Development Requesters.
* `GET /api/categories` — Retrieve all IT request categories.
* `GET /api/related-systems` — Retrieve active Related Systems.
* `POST /api/tickets` — Create a ticket (supports multipart attachments).
* `GET /api/tickets` — Retrieve paginated tickets for the active requester (supports `search`, `category`, `status`, `priority`, `page`, `pageSize`, `sortBy`, `sortOrder`).
* `GET /api/tickets/:id` — Retrieve single ticket details with attachments (enforces requester ownership).
* `GET /api/attachments/:id` — Retrieve single attachment metadata.
* `POST /api/tickets/:id/attachments` — Upload attachment to existing ticket.
* `GET /api/attachments/:id/download` — Download active attachment file binary.
* `PATCH /api/attachments/:id/soft-remove` — Soft-remove attachment with reason.

---

## 9. Acceptance Criteria

* **AC-01 (Valid Ticket Creation)**:
  * **Given** a selected active Development Requester and valid form values (Category, Related System, Priority, Summary of 5–100 chars, Description of 10–2000 chars),
  * **When** the user clicks "Submit Ticket",
  * **Then** the ticket is persisted in PostgreSQL with status `NEW`, an official `TKT-YYYY-XXXXXX` number is generated, and the user is navigated to a success confirmation view showing the ticket number.

* **AC-02 (Frontend & Backend Form Validation)**:
  * **Given** a ticket submission with missing fields, summary < 5 chars, or description < 10 chars,
  * **When** submission is attempted,
  * **Then** submission is blocked, red field-level validation messages appear directly under the invalid inputs, and no database record is created.

* **AC-03 (Attachment Upload on Creation)**:
  * **Given** 1 to 5 valid attachments (PNG, JPG, WEBP, PDF, each ≤ 5 MB and > 0 bytes),
  * **When** the ticket is submitted,
  * **Then** the files are securely stored on disk and linked as active Attachment records to the new Ticket.

* **AC-04 (Invalid Attachment Rejection)**:
  * **Given** an attachment exceeding 5 MB, an empty 0-byte file, or an unsupported file extension (e.g. `.exe`, `.zip`),
  * **When** selected in the UI,
  * **Then** the UI displays an immediate file validation error, excludes the file, and disables form submission until corrected.

* **AC-05 (Duplicate Submission Prevention)**:
  * **Given** a valid ticket form,
  * **When** the user clicks Submit,
  * **Then** the submit button immediately displays a loading spinner, changes label to "Submitting...", and is disabled to prevent duplicate POST requests.

* **AC-06 (Data Preservation on Network Failure)**:
  * **Given** filled form fields and an unreachable backend,
  * **When** the user clicks Submit,
  * **Then** a prominent error banner appears ("Unable to connect to TokTickIT API"), and all entered summary, description, and dropdown selections remain intact.

* **AC-07 (Development Requester Initial Selection)**:
  * **Given** no Requester context has been chosen,
  * **When** accessing the application,
  * **Then** the Development Requester selection screen is presented, displaying only active Requesters.

* **AC-08 (Inactive Requester Filtering)**:
  * **Given** an inactive Requester in the database (`isActive = false`),
  * **When** the Requester selector loads,
  * **Then** the inactive Requester is not present in the dropdown options.

* **AC-09 (Requester Context Switching)**:
  * **Given** Requester A is active,
  * **When** the user switches to Requester B via "Change Requester",
  * **Then** the header updates to Requester B, and My Tickets immediately reloads to show only Requester B's tickets.

* **AC-10 (My Tickets Ownership Isolation)**:
  * **Given** Requester A has 3 tickets and Requester B has 2 tickets,
  * **When** Requester A views My Tickets,
  * **Then** only Requester A's 3 tickets are displayed; Requester B's tickets are completely omitted.

* **AC-11 (My Tickets Search & Filtering)**:
  * **Given** a list of owned tickets,
  * **When** the Requester enters a search keyword (e.g. "VPN") or filters by Category/Status/Priority,
  * **Then** the table displays only the tickets matching all active search and filter criteria.

* **AC-12 (My Tickets Empty & No-Results States)**:
  * **Given** a Requester with 0 tickets created,
  * **When** viewing My Tickets,
  * **Then** a friendly empty state ("You haven't submitted any tickets yet") with a "Create Ticket" button is displayed. If filters match 0 tickets, a distinct "No matching tickets found" message appears with a "Clear Filters" action.

* **AC-13 (Ticket Detail Read-Only View)**:
  * **Given** an existing owned ticket,
  * **When** opening the Ticket Detail screen,
  * **Then** all ticket header values are displayed in styled read-only fields, and active attachments are listed.

* **AC-14 (Cross-Requester Ticket Access Rejection)**:
  * **Given** Requester A is selected and attempts to access `/api/tickets/:id` belonging to Requester B,
  * **When** the request is made,
  * **Then** the server responds with HTTP 403 Forbidden or 404 Not Found, and the UI displays an Access Denied / Not Found alert.

* **AC-15 (Add Attachment to Existing Ticket)**:
  * **Given** an owned ticket with 3 active attachments,
  * **When** the Requester uploads a valid 4th attachment,
  * **Then** the file is stored, the active count becomes 4, and the attachment list updates.

* **AC-16 (Active Attachment Cap Enforcement)**:
  * **Given** a ticket with 5 active attachments,
  * **When** viewing the attachment section,
  * **Then** the upload button/dropzone is disabled with a message indicating the maximum limit of 5 attachments has been reached.

* **AC-17 (Attachment Soft-Removal with Reason)**:
  * **Given** an active attachment on an owned ticket,
  * **When** the Requester clicks "Remove", confirms the dialog, and enters a removal reason (min 3 chars),
  * **Then** the attachment is marked `isRemoved = true` with reason and timestamp recorded, and the UI displays it as "Removed" with download disabled.

* **AC-18 (Blocked Download of Soft-Removed File)**:
  * **Given** a soft-removed attachment,
  * **When** an HTTP GET is sent to `/api/attachments/:id/download`,
  * **Then** the backend returns HTTP 410 Gone (or 404) and refuses to stream the file binary.

* **AC-19 (Responsive & Zen Green Conformance)**:
  * **Given** any screen resolution (Desktop ≥992px, Tablet 768–991px, Mobile <768px),
  * **When** navigating the application,
  * **Then** all Zen Green color tokens are honored, text remains readable without clipping, forms stack properly on mobile, and horizontal scroll is absent.

---

## 10. Definition of Done (DoD)

### 10.1. Product Completion Checklist
- [ ] **Database & Migrations**: Prisma schema includes `RequesterUser`, `Category`, `RelatedSystem`, `Ticket`, and `Attachment` with relations, indexes, and soft-delete fields. Idempotent seed executes successfully.
- [ ] **Backend APIs**: All REST endpoints implemented in Express with TypeScript, input validation, safe error handling, and ownership checks.
- [ ] **Frontend Screens**: Development Requester Selector, Create Ticket form, My Tickets dashboard, and Ticket Detail view fully implemented following the Zen Green theme and responsive layout rules.
- [ ] **Validation & Boundary Handling**: Strict client and server validation for string lengths, file types, file size (5 MB), active attachment limits (5 max), and duplicate submission prevention.
- [ ] **Ownership Protection**: 100% isolation verified between Requesters across list, detail, upload, download, and soft-removal APIs.
- [ ] **Automated Test Suite**:
  - Supertest API test suite (`server/tests/lab-02/`) passes with 100% green status.
  - Vitest UI test suite (`client/tests/lab-02/`) passes with 100% green status.
  - Playwright E2E test suite (`e2e/lab-02/`) passes on Desktop, Tablet, and Mobile viewports.
  - Zero skipped, disabled, or flaky tests.

### 10.2. Course Delivery Checklist
- [ ] **Git Workflow**: Development completed on `feature/*` branches, merged into `lab2-staging` via PRs, and released to `main`.
- [ ] **Peer Review**: PR review comments and approvals documented in `docs/lab-02/reviewer.md`.
- [ ] **AI Use Log**: AI reflection and prompt history documented in `docs/lab-02/ai-use.md`.
- [ ] **Evidence & Screenshots**: Screenshot artifacts generated in `artifacts/lab-02/screenshots/` and compiled into the single 9-part PDF submission.

---

## 11. Assumptions and Technical Decisions

1. **Ticket Number Format**: `TKT-YYYY-XXXXXX` (e.g. `TKT-2026-000001`), generated inside a Prisma database transaction using a sequential counter to guarantee gapless uniqueness.
2. **Attachment Storage**: Uploaded files stored locally in `server/uploads/attachments/` keyed by UUID with file extension preserved, while original file names are stored separately in the database to prevent filename injection attacks.
3. **Soft Removal Reason**: Removal reason is required with a minimum length of 3 characters and maximum 255 characters to ensure auditability.
4. **Pagination Defaults**: Default page size is 10 items, with allowed options of 5, 10, 25, 50.
5. **Simulated Requester Session**: Stored in React state and mirrored in `localStorage` under `toktickit_dev_requester_id` for convenience during local development reloads.
