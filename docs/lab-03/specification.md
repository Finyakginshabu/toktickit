# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a secure, role-driven full-stack increment for TokTickIT replacing the temporary Development Requester selector with production-grade authentication, first-login mandatory password change, and server-side role-based access control (RBAC). Enable IT Staff operational workflows (shared Ticket Queue, Ticket Detail, Ticket Claim/Reassignment, IT Priority updates, status transitions, Public Comments, and Internal Notes) and minimalist Administrator user management, while ensuring 100% regression safety for existing Lab 2 Requester capabilities (including attachment lifecycle management) and preserving database continuity.

---

## 2. Stakeholder Request Interpretation
The stakeholder requires the elimination of the development-only Requester selector in favor of authentic user login with email and password credentials. Authenticated users are divided into three distinct roles: Requesters, IT Staff, and Administrators. Requesters must continue creating and tracking their own tickets and attachments using their real authenticated identity, with new capabilities to participate in Public Comments and indicate when a problem appears resolved. IT Staff require an operational Ticket Queue and Detail interface to claim, assign, prioritize, advance ticket statuses, and collaborate using both Public Comments and role-restricted Internal Notes. Administrators require a minimalist User Management screen to list, create, edit, activate/deactivate accounts, and assign temporary passwords, while retaining administrative oversight across ticket operations. Security must be enforced on the backend through ownership and role authorization rather than cosmetic UI hiding, all while maintaining the Zen Green aesthetic.

---

## 3. Scope

### Included
1. **Authentication & Session Lifecycle**:
   - Secure login using email and hashed password (bcrypt).
   - Inactive account blocking on authentication with safe generic feedback.
   - Mandatory first-login password change for accounts flagged with initial passwords, enforced at both the UI routing and API middleware layers (`PASSWORD_CHANGE_REQUIRED`).
   - Secure token/session management, current user identity retrieval (`/api/auth/me`), and clean logout.
2. **Role-Based Access Control (RBAC) & Shell Navigation**:
   - Three permitted roles: `Requester`, `IT Staff`, `Administrator`.
   - Application shell navigation dynamically tailored to the authenticated user's role.
   - Strict server-side route and resource authorization on all API endpoints.
3. **Database & Data Migration**:
   - Evolution of `RequesterUser` into the unified `User` model with roles, password hashes, activation state, and password change flags.
   - Preservation of existing Category, Related System, Ticket, and Attachment data.
   - Ticket status enum expansion: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
   - Creation of append-only `PublicComment` and `InternalNote` entities.
   - Idempotent seed data with active/inactive accounts across all three roles and realistic ticket distributions.
4. **Requester Continuity & Attachment Lifecycle Regression**:
   - Regression preservation of Create Ticket, My Tickets, Ticket Detail, and Attachment management (upload up to 5 cap, download active, soft-removal with reason, 410 on removed download) backed by authenticated identity.
   - Ability to post Public Comments on owned tickets.
   - Ability to indicate that a problem "Appears Resolved" on owned tickets.
5. **IT Staff Operational Workflow**:
   - Shared IT Staff Ticket Queue with search, multi-criteria filtering, sorting, and pagination.
   - IT Staff Ticket Detail view with operational controls.
   - Ticket ownership claiming and reassignment.
   - IT Priority editing (independent of Requester's initial Requested Priority).
   - Ticket status progression following a strict transition matrix.
   - Viewing and creating Public Comments and role-restricted Internal Notes.
6. **Administrator User Management & Operational Oversight**:
   - User list table showing Name, Email, Role, Status, and Edit action.
   - Search by name/email and optional role filtering.
   - User creation with single role assignment and initial password.
   - User editing (Name, Email, Role, Active status).
   - Resetting initial passwords with forced change at next login.
   - Administrator safety protections: prevent self-deactivation and prevent removal/deactivation of the last active Administrator.
   - Administrative supervisory oversight across ticket queues and operational modifications.
7. **Zen Green UI & Responsive Layouts**:
   - Implementation across Desktop ($\ge 992\text{px}$), Tablet ($768\text{px} - 991\text{px}$), and Mobile ($< 768\text{px}$).

### Excluded
1. **Advanced Identity & Auth Services**:
   - Email delivery of invitations, password resets, or initial passwords.
   - Multi-factor authentication (MFA), OAuth / Social login, SSO.
   - Self-registration / public sign-up for Requesters.
   - Account unlocking workflows and administrator approval chains.
2. **IT Staff Exclusions**:
   - "Actions Taken" by IT Staff (deferred to Lab 4).
   - Blocking ticket resolution based on Actions Taken (deferred to Lab 4).
   - Formal SLA calculations, automated escalation timers, and notification alerts.
   - KPI metrics and graphical analytics dashboards beyond basic queue counts.
3. **Administration Exclusions**:
   - Multiple roles per user (each user must have exactly one role).
   - User deletion (soft deactivation is used exclusively).
   - Bulk user actions, user CSV/Excel import/export.
   - Role history and account audit trail screens.
   - Department, organization, and profile image management.
   - Mandatory user-list pagination, multi-column sorting, or multi-filter combinations.
   - Multi-tenant organizations or company structures.
4. **Ticket & Collaboration Exclusions**:
   - Editing or deleting Public Comments or Internal Notes (both are strictly append-only).
   - Production cloud deployment or cloud hosting infrastructure.

---

## 4. Functional Requirements

* **FR-01 (Authentication)**: The system shall authenticate users via email and password, establishing an authenticated session and returning user identity and role.
* **FR-02 (Inactive Account Handling)**: The system shall reject authentication attempts for deactivated accounts (`isActive = false`) with a safe, generic error message.
* **FR-03 (Mandatory First-Login Password Change)**: The system shall detect users with `mustChangePassword = true` upon login and redirect them to a mandatory password change screen, blocking access to normal application screens and endpoints until a valid new password is saved.
* **FR-04 (Current User Identity & Session)**: The system shall provide an endpoint to retrieve the currently authenticated user's profile and role, and provide a logout endpoint that invalidates authenticated access.
* **FR-05 (Role-Based Navigation)**: The application shell shall display the user's name and role badge, presenting navigation links strictly restricted to the user's permitted role:
  * Requester: *My Tickets*, *Create Ticket*.
  * IT Staff: *Ticket Queue*, *Create Ticket*.
  * Administrator: *User Management*.
* **FR-06 (Requester Functionality & Attachment Continuity)**: Requesters shall continue to create tickets, view My Tickets, view Ticket Detail, upload attachments (max 5 active), download active attachments, and soft-remove attachments with reason using their authenticated identity without client-supplied `requesterId`.
* **FR-07 (Requester Resolution Indication)**: An authenticated Requester shall be able to indicate on an owned ticket that the problem appears resolved, recording the indication and posting an automatic audit comment.
* **FR-08 (IT Staff Ticket Queue)**: The system shall provide IT Staff and Administrators with a unified Ticket Queue displaying tickets across all requesters, supporting search (summary and ticket number), filtering (category, status, priority, ownership), sorting, and pagination.
* **FR-09 (IT Staff Ticket Detail)**: The system shall display the full ticket details to IT Staff and Administrators, including read-only requester information, editable IT Priority, editable Ticket Owner, permitted status transitions, attachments, Public Comments, and Internal Notes.
* **FR-10 (Ticket Ownership Management)**: IT Staff and Administrators shall be able to claim unassigned tickets or reassign ticket ownership to any active IT Staff or Administrator account.
* **FR-11 (IT Priority Control)**: IT Staff and Administrators shall be able to update the IT Priority of a ticket independently of the Requester's initial Requested Priority.
* **FR-12 (Ticket Status Workflow Enforcement)**: The system shall allow IT Staff and Administrators to transition ticket status strictly according to the defined lifecycle transition matrix.
* **FR-13 (Public Comments)**: Requesters (for owned tickets), IT Staff, and Administrators shall be able to submit and read append-only Public Comments.
* **FR-14 (Internal Notes)**: IT Staff and Administrators shall be able to submit and read append-only Internal Notes. Requesters shall be strictly prevented from viewing or creating Internal Notes.
* **FR-15 (Administrator User Listing)**: Administrators shall be able to view a list of all user accounts displaying Name, Email, Role, Status, and Edit action, with search by name/email and optional role filter.
* **FR-16 (Administrator User Creation)**: Administrators shall be able to create new user accounts specifying Name, Email, exactly one role, activation state, and an initial password (flagged with `mustChangePassword = true`).
* **FR-17 (Administrator User Modification)**: Administrators shall be able to edit a user's Name, Email, Role, and activation state, subject to safety constraints.
* **FR-18 (Administrator Password Reset)**: Administrators shall be able to set a new initial password for any user, resetting `mustChangePassword = true`.
* **FR-19 (Administrator Safety Rules)**: The system shall prevent an Administrator from deactivating their own account and prevent deactivating or demoting the last active Administrator in the system.

---

## 5. Business Rules

| Rule ID | Category | Business Rule Description |
| :--- | :--- | :--- |
| **BR-01** | Authentication | Only an active user (`isActive = true`) with valid matching credentials may authenticate. Invalid credentials or inactive accounts return a safe generic failure message (`Invalid email or password`). Email lookups must be case-insensitive (`toLowerCase().trim()`). |
| **BR-02** | First-Login Password & API Route Guard | A user marked with `mustChangePassword = true` cannot access normal application screens or endpoints until a new password meeting complexity requirements is saved. Direct API calls to protected business endpoints return HTTP 403 with code `PASSWORD_CHANGE_REQUIRED`. |
| **BR-03** | Authenticated Identity | The server-side authenticated user identity, derived from the validated token/session, determines ownership of all Requester ticket and attachment operations. Client-supplied `requesterId` inputs are rejected or ignored. |
| **BR-04** | Comment Visibility | Public Comments are visible to the Ticket Requester, all IT Staff, and Administrators. Internal Notes are operational notes visible strictly to IT Staff and Administrators. |
| **BR-05** | Requester Resolution Boundary | A Requester may indicate that the reported problem appears resolved (`problemAppearsResolved = true`), but cannot formally set the Ticket status to `RESOLVED` or `CLOSED`. Formal status changes are reserved for IT Staff and Administrators. |
| **BR-06** | Credential Hashing, Complexity & Reuse | Passwords must be hashed using bcrypt (salt rounds $\ge 10$) and never stored in plaintext. New passwords must be at least 8 characters, contain uppercase, lowercase, number/special character, and must be different from the current password (`newPassword !== currentPassword`). |
| **BR-07** | Single Role Assignment | Every user possesses exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are prohibited. |
| **BR-08** | Admin Self-Protection | An Administrator is strictly prohibited from deactivating their own currently authenticated account. |
| **BR-09** | Last Admin Protection | The system must prevent deactivating, deleting, or changing the role of the last active Administrator in the database. |
| **BR-10** | Deactivation vs. Deletion | User accounts are never deleted from the database. Inactive users have `isActive = false`, preventing login while preserving historical audit relationships. |
| **BR-11** | Email Uniqueness & Self-Exclusion | Email addresses must be globally unique across all accounts. Creating a user with an existing email returns HTTP 409. When editing a user, the duplicate email check excludes the user's own `id`. |
| **BR-12** | IT Priority Initialization | Upon ticket creation, `itPriority` automatically defaults to match `requestedPriority`. Thereafter, `itPriority` can only be modified by IT Staff or Administrators. |
| **BR-13** | Ticket Ownership Assignment Validation | Ownership may only be assigned to active users (`isActive = true`) with role `IT_STAFF` or `ADMINISTRATOR`. Assigning ownership to a Requester or inactive user is rejected with HTTP 400 Bad Request. |
| **BR-14** | Status Transition Lifecycle | Ticket status must advance strictly according to the approved transition matrix: <br>• `NEW` $\to$ `OPEN`<br>• `OPEN` $\to$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`<br>• `IN_PROGRESS` $\to$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`<br>• `WAITING_FOR_REQUESTER` $\to$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`<br>• `RESOLVED` $\to$ `CLOSED`, `REOPENED`<br>• `CLOSED` $\to$ `REOPENED`<br>• `REOPENED` $\to$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`<br>• `CANCELLED` $\to$ (Terminal / Reopenable only by IT Staff). |
| **BR-15** | Append-Only Communications & Trimming | Public Comments and Internal Notes are strictly append-only. Modification and deletion are prohibited. Entries must contain 1 to 2000 characters after whitespace trimming. Whitespace-only submissions are rejected with HTTP 400. |
| **BR-16** | Note Confidentiality & Safe Errors | Requesters attempting to view or create Internal Notes must receive HTTP 403 Forbidden without any disclosure of internal note metadata or content. |
| **BR-17** | Initial Password Reset Flag | When an Administrator creates a new user or sets a new initial password, the backend must automatically set `mustChangePassword = true`. |
| **BR-18** | Attachment Continuity & Soft-Removal Idempotency | Max 5 active attachments per ticket, allowed MIME types (`JPG`, `PNG`, `WEBP`, `PDF`), max file size 5 MB, soft-removal with reason ($\ge 3$ chars), and blocked download of soft-removed files returning HTTP 410 Gone. Attempting to soft-remove an already-removed attachment returns HTTP 400 Bad Request. Cross-user download attempts return HTTP 403 / 404. |
| **BR-19** | Query Parameter Clamping & Pagination | Queue query parameter `pageSize` is clamped to $1 \le \text{pageSize} \le 50$. If a requested `page > totalPages`, the API returns `data: []` with accurate pagination metadata rather than an error. |

---

## 6. Authorization Matrix (Role × Endpoint × Ownership)

Every protected backend operation is governed by server-side role and ownership verification:

| Endpoint / Operation | HTTP Method | Requester (End User) | IT Staff | Administrator | Ownership / Boundary Check |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `POST /api/auth/login` | POST | Public | Public | Public | Only active accounts (`isActive = true`) |
| `POST /api/auth/logout` | POST | Authenticated | Authenticated | Authenticated | Invalidate token / session |
| `GET /api/auth/me` | GET | Authenticated | Authenticated | Authenticated | Returns own profile and role |
| `POST /api/auth/change-password` | POST | Authenticated | Authenticated | Authenticated | Complexity rules; `new !== current` |
| `GET /api/categories` | GET | Public / All | Public / All | Public / All | Reference data |
| `GET /api/related-systems` | GET | Public / All | Public / All | Public / All | Reference data |
| `POST /api/tickets` | POST | Allowed | Allowed | Allowed | Authenticated user is recorded as `requesterId` |
| `GET /api/tickets/my-tickets` | GET | Owned Only | Owned Only | Owned Only | Strictly filtered to `requesterId = currentUser.id` |
| `GET /api/tickets/:id` | GET | Owned Only | Any Ticket | Any Ticket | Requester gets `403/404` for unowned tickets |
| `POST /api/tickets/:id/attachments` | POST | Owned Only | Any Ticket | Any Ticket | Cap of 5 active attachments per ticket enforced |
| `GET /api/attachments/:id` | GET | Owned Only | Any Ticket | Any Ticket | Attachment metadata lookup |
| `GET /api/attachments/:id/download` | GET | Owned Only | Any Ticket | Any Ticket | Blocked if `isRemoved = true` (`410 Gone`) |
| `PATCH /api/attachments/:id/soft-remove` | PATCH | Owned Only | Any Ticket | Any Ticket | Requires `removedReason` ($\ge 3$ chars) |
| `POST /api/tickets/:id/indicate-resolved` | POST | Owned Only | Forbidden | Forbidden | Requester indicates problem appears resolved |
| `GET /api/staff/tickets` | GET | **Forbidden (403)** | Allowed | Allowed | Shared Ticket Queue with filters & pagination |
| `PATCH /api/tickets/:id/assignment` | PATCH | **Forbidden (403)** | Allowed | Allowed | Assign to active IT Staff or Administrator |
| `PATCH /api/tickets/:id/priority` | PATCH | **Forbidden (403)** | Allowed | Allowed | Modifies `itPriority` |
| `PATCH /api/tickets/:id/status` | PATCH | **Forbidden (403)** | Allowed | Allowed | Enforces approved lifecycle transition matrix |
| `GET /api/tickets/:id/comments` | GET | Owned Only | Any Ticket | Any Ticket | Public comments stream |
| `POST /api/tickets/:id/comments` | POST | Owned Only | Any Ticket | Any Ticket | Append-only public communication |
| `GET /api/tickets/:id/notes` | GET | **Forbidden (403)** | Allowed | Allowed | Requesters blocked without note disclosure |
| `POST /api/tickets/:id/notes` | POST | **Forbidden (403)** | Allowed | Allowed | Append-only internal notes |
| `GET /api/admin/users` | GET | **Forbidden (403)** | **Forbidden (403)** | Allowed | User list with search & role filters |
| `POST /api/admin/users` | POST | **Forbidden (403)** | **Forbidden (403)** | Allowed | Create user with initial password |
| `PATCH /api/admin/users/:id` | PATCH | **Forbidden (403)** | **Forbidden (403)** | Allowed | Edit user; blocks self/last admin deactivation |
| `POST /api/admin/users/:id/reset-password` | POST | **Forbidden (403)** | **Forbidden (403)** | Allowed | Sets initial password; `mustChangePassword=true` |

---

## 7. UI Specification Summary
The interface strictly extends the **Zen Green Theme** documented in `docs/lab-03/ui-spec.md`:
* **App Shell**: Top header displays TokTickIT logo, role-restricted navigation links, active user's Name, Role badge (`Requester`: pale green, `IT Staff`: primary green, `Admin`: amber/charcoal), and a **Logout** button.
* **Login & Mandatory Password Change Screens**: Clean, centered Zen Green card containers with clear field validation, busy spinner on submit, and inline error banners for invalid credentials or inactive accounts. Password change screen includes real-time checklist for complexity rules.
* **Requester Screens**:
  * Create Ticket and My Tickets preserved with authenticated identity.
  * Requester Ticket Detail includes a read-only header, Attachment section (view, download, soft-removal modal), Public Comments thread, and a prominent **"Problem Appears Resolved"** action button.
* **IT Staff Ticket Queue**: Search bar, multi-criteria filter toolbar (Category, Status, IT Priority, Owner), sortable data table with status badges and priority indicators, owner display (or "Unassigned"), and pagination footer.
* **IT Staff Ticket Detail**: Dual-column layout with operational header controls (Ticket Owner dropdown with "Claim" button, IT Priority dropdown, status transition action dropdown), Attachment management, and visually distinct tabbed/split sections for **Public Comments** (white card, green accents) versus **Internal Notes** (pale amber/ivory card with yellow/amber alert badge to prevent accidental leaks).
* **Administrator User Management**: Minimalist responsive data table listing Name, Email, Role, Status badge, and Edit button. Includes search input, role filter, **"+ Create User"** modal, **"Edit User"** modal, and **"Reset Initial Password"** modal.

---

## 8. Data Changes (Prisma Schema Design)

### 8.1. Entity Relationship Model
```
+--------------------+        1:N (Requester)        +--------------------+
|        User        | ----------------------------< |       Ticket       |
|  (Role, Auth, etc) |                               +--------------------+
+--------------------+        1:N (Owner)                      | 1:N
        |   |          ----------------------------<           |
        |   |                                                  v
        |   |  1:N                                   +--------------------+
        |   +--------------------------------------< |     Attachment     |
        |                                            +--------------------+
        | 1:N                                                  | 1:N
        v                                                      v
+--------------------+        1:N (Author)           +--------------------+
|   PublicComment    | >---------------------------- |   InternalNote     |
+--------------------+                               +--------------------+
```

### 8.2. Prisma Models & Enums
```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                 Int              @id @default(autoincrement())
  email              String           @unique
  name               String
  passwordHash       String
  role               Role             @default(REQUESTER)
  isActive           Boolean          @default(true)
  mustChangePassword Boolean          @default(false)
  department         String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  requestedTickets   Ticket[]         @relation("TicketRequester")
  assignedTickets    Ticket[]         @relation("TicketOwner")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]

  @@index([email])
  @@index([role, isActive])
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
  id                        Int             @id @default(autoincrement())
  ticketNumber              String          @unique
  requesterId               Int
  categoryId                Int
  relatedSystemId           Int
  summary                   String          @db.VarChar(100)
  description               String          @db.VarChar(2000)
  requestedPriority         Priority        @default(MEDIUM)
  itPriority                Priority        @default(MEDIUM)
  currentStatus             TicketStatus    @default(NEW)
  ticketOwnerId             Int?
  resolutionSummary         String?
  problemAppearsResolved    Boolean         @default(false)
  problemAppearsResolvedAt  DateTime?
  createdAt                 DateTime        @default(now())
  updatedAt                 DateTime        @updatedAt

  requester                 User            @relation("TicketRequester", fields: [requesterId], references: [id])
  ticketOwner               User?           @relation("TicketOwner", fields: [ticketOwnerId], references: [id])
  category                  Category        @relation(fields: [categoryId], references: [id])
  relatedSystem             RelatedSystem   @relation(fields: [relatedSystemId], references: [id])
  attachments               Attachment[]
  publicComments            PublicComment[]
  internalNotes             InternalNote[]

  @@index([requesterId, createdAt])
  @@index([currentStatus])
  @@index([itPriority])
  @@index([ticketOwnerId])
  @@index([ticketNumber])
}

model Attachment {
  id            Int       @id @default(autoincrement())
  ticketId      Int
  fileName      String
  originalName  String
  fileSize      Int
  mimeType      String
  storagePath   String
  isRemoved     Boolean   @default(false)
  removedReason String?
  removedAt     DateTime?
  uploadedAt    DateTime  @default(now())

  ticket        Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, isRemoved])
}

model PublicComment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.VarChar(2000)
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId, createdAt])
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.VarChar(2000)
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId, createdAt])
}
```

### 8.3. Migration & Seed Decisions
* **Database Migration**: Evolve `RequesterUser` table to `User` without data loss. Existing ticket relationships (`requesterId`) remain preserved. Seeded Requesters receive default initial passwords (e.g., `Password123!`) with `mustChangePassword = false` for test stability, while newly created initial accounts receive `mustChangePassword = true`.
* **Seed Data Profile**:
  * **Requesters**: 4 active (`jennifer.anderson@kmutt.ac.th`, `david.lee@kmutt.ac.th`, `sarah.johnson@kmutt.ac.th`, `michael.brown@kmutt.ac.th`) and 1 inactive (`alex.inactive@kmutt.ac.th`).
  * **IT Staff**: 3 active (`staff.alice@toktickit.local`, `staff.bob@toktickit.local`, `staff.charlie@toktickit.local`) and 1 inactive (`staff.inactive@toktickit.local`).
  * **Administrator**: 1 active Administrator (`admin@toktickit.local`).
  * **Tickets & Discussions**: Seeded tickets with unassigned, assigned, in-progress, resolved statuses, sample Public Comments, and sample Internal Notes.

---

## 9. API Contract Summary
Detailed request/response contracts are defined in `docs/lab-03/api-spec.md`. Key capabilities:
* **Authentication**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
* **Requester Tickets & Attachments**: `GET /api/tickets/my-tickets`, `POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, `PATCH /api/attachments/:id/soft-remove`, `POST /api/tickets/:id/indicate-resolved`.
* **IT Staff Operations**: `GET /api/staff/tickets`, `PATCH /api/tickets/:id/assignment`, `PATCH /api/tickets/:id/priority`, `PATCH /api/tickets/:id/status`.
* **Discussions**: `GET /api/tickets/:id/comments`, `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/notes`, `POST /api/tickets/:id/notes`.
* **Administrator User Management**: `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`.

---

## 10. Acceptance Criteria

* **AC-01 (Valid Authentication)**:
  * **Given** an active user with valid credentials,
  * **When** the user submits the login form,
  * **Then** the backend returns an authenticated session, user profile, role, and navigation access.
* **AC-02 (Mandatory First-Login Password Change)**:
  * **Given** a user with `mustChangePassword = true`,
  * **When** login succeeds,
  * **Then** the user is directed to the Change Password screen, and normal application routes/endpoints remain inaccessible (returning HTTP 403 `PASSWORD_CHANGE_REQUIRED`) until a valid password is saved.
* **AC-03 (Requester Identity Enforcement)**:
  * **Given** an authenticated Requester,
  * **When** accessing or submitting tickets,
  * **Then** the backend applies the authenticated user's ID and prevents viewing or creating tickets under another user's identity.
* **AC-04 (Internal Note Forbidden for Requester)**:
  * **Given** an authenticated Requester,
  * **When** attempting to fetch or post to `/api/tickets/:id/notes`,
  * **Then** the server responds with HTTP 403 Forbidden without disclosing note existence or data.
* **AC-05 (Invalid & Inactive Account Login Rejection)**:
  * **Given** incorrect credentials or an inactive account (`isActive = false`),
  * **When** login is attempted,
  * **Then** the backend returns HTTP 401 Unauthorized with a safe generic error message ("Invalid email or password").
* **AC-06 (Logout Invalidation)**:
  * **Given** an authenticated user session,
  * **When** the user clicks Logout,
  * **Then** authenticated access is terminated and subsequent requests to protected endpoints return HTTP 401.
* **AC-07 (Role-Based Navigation)**:
  * **Given** an authenticated user,
  * **When** viewing the application shell,
  * **Then** the navigation bar presents only destinations permitted for their specific role.
* **AC-08 (Requester Regression)**:
  * **Given** an authenticated Requester,
  * **When** creating a ticket or listing owned tickets,
  * **Then** all Lab 2 ticket creation, validation, filtering, sorting, and pagination continue functioning correctly without client-supplied `requesterId`.
* **AC-09 (Requester Resolution Indication)**:
  * **Given** an authenticated Requester viewing an owned open ticket,
  * **When** the Requester clicks "Problem Appears Resolved",
  * **Then** `problemAppearsResolved` is set to true, an automatic audit comment is posted, and the formal ticket status remains unchanged.
* **AC-10 (IT Staff Ticket Queue Retrieval)**:
  * **Given** an authenticated IT Staff or Admin member,
  * **When** opening the Ticket Queue,
  * **Then** all tickets across all requesters are displayed with working search, filters (category, priority, status, ownership), sorting, and pagination (with `pageSize` clamped $1\dots50$).
* **AC-11 (Claim Ticket Ownership)**:
  * **Given** an unassigned ticket,
  * **When** an IT Staff member clicks "Claim Ticket",
  * **Then** the ticket owner is updated to the current user, and status transitions to `OPEN` if currently `NEW`.
* **AC-12 (Reassign Ticket Ownership)**:
  * **Given** an open ticket,
  * **When** an IT Staff member or Admin selects another active IT Staff or Admin as owner,
  * **Then** ticket ownership is updated in the database. Assigning to a Requester or inactive staff returns HTTP 400.
* **AC-13 (IT Priority Modification)**:
  * **Given** an active ticket,
  * **When** IT Staff or Admin modifies the IT Priority,
  * **Then** `itPriority` is updated while `requestedPriority` remains strictly unchanged.
* **AC-14 (Permitted Status Transition)**:
  * **Given** a ticket in status `OPEN`,
  * **When** IT Staff updates status to `IN_PROGRESS`,
  * **Then** the new status is persisted.
* **AC-15 (Forbidden Status Transition)**:
  * **Given** a ticket in status `NEW`,
  * **When** an invalid transition is attempted (e.g., directly to `CLOSED`),
  * **Then** the backend rejects the request with HTTP 400 Bad Request.
* **AC-16 (Public Comments Thread)**:
  * **Given** an authorized user (Requester for owned ticket, IT Staff, Admin),
  * **When** a non-empty public comment (1–2000 chars) is submitted,
  * **Then** it is saved and visible to all authorized parties. Whitespace-only submission is rejected with HTTP 400.
* **AC-17 (Internal Notes Thread)**:
  * **Given** an IT Staff or Admin user,
  * **When** an internal note is submitted,
  * **Then** it is saved and visible strictly to IT Staff and Administrators.
* **AC-18 (Admin User Listing & Search)**:
  * **Given** an authenticated Administrator,
  * **When** viewing the User Management screen,
  * **Then** users are listed with Name, Email, Role, and Status, supporting keyword search and role filtering.
* **AC-19 (Admin Create User)**:
  * **Given** an Administrator submitting valid user details and an initial password,
  * **When** submitted,
  * **Then** the user is created with `mustChangePassword = true`.
* **AC-20 (Admin Edit User)**:
  * **Given** an Administrator updating a user's Name, Role, or activation state,
  * **When** saved,
  * **Then** the changes are persisted. Retaining the user's existing email does not trigger a duplicate email conflict.
* **AC-21 (Admin Self-Deactivation Prevention)**:
  * **Given** an Administrator editing their own account,
  * **When** attempting to set `isActive = false`,
  * **Then** the backend and UI block the request with a clear safety error.
* **AC-22 (Last Active Admin Protection)**:
  * **Given** the sole active Administrator in the system,
  * **When** an attempt is made to deactivate or change their role,
  * **Then** the operation is rejected with HTTP 400 Bad Request.
* **AC-23 (Admin Initial Password Reset)**:
  * **Given** an Administrator resetting a user's password,
  * **When** a new initial password is saved,
  * **Then** the new password is set and `mustChangePassword` is updated to `true`.
* **AC-24 (Non-Admin User Management Forbidden)**:
  * **Given** a Requester or IT Staff user,
  * **When** requesting any `/api/admin/users` endpoint,
  * **Then** the server responds with HTTP 403 Forbidden.
* **AC-25 (Attachment Lifecycle Regression)**:
  * **Given** an authenticated user,
  * **When** uploading up to 5 valid attachments, downloading active attachments, or soft-removing attachments with a reason,
  * **Then** operations succeed on owned tickets (or for IT Staff/Admin), exceeding 5 active files returns HTTP 400, soft-removal records reason, soft-removing an already removed attachment returns HTTP 400, downloading soft-removed files returns HTTP 410 Gone, and cross-requester attachment downloads return HTTP 403 / 404.

---

## 11. Product Definition of Done (DoD)

### 11.1. Product Completion Checklist
- [ ] **Database & Migrations**: Prisma schema evolved from `RequesterUser` to `User` without data loss. `PublicComment`, `InternalNote`, role enums, and expanded `TicketStatus` enums verified. Idempotent seed populates required accounts across all 3 roles.
- [ ] **Backend Authorization & Middleware Guard**: All endpoints enforce server-side RBAC and ownership verification based on the Authorization Matrix. Users with `mustChangePassword = true` are locked to `/api/auth/change-password`. Passwords securely hashed with bcrypt. Safe error status codes (401, 403, 404, 409) returned.
- [ ] **Frontend Screens**:
  - Login and Mandatory Password Change screens.
  - IT Staff Ticket Queue with search, filters, sorting, and pagination.
  - IT Staff Ticket Detail with claim/reassign, IT priority, status workflow, public comments, and internal notes.
  - Requester Ticket Detail with Public Comments and "Problem Appears Resolved" indication.
  - Minimalist Administrator User Management screen with create, edit, activate/deactivate, and initial password reset modals.
- [ ] **Attachment Regression**: Full upload, download, 5-cap, and soft-removal behaviors verified working with authenticated session tokens.
- [ ] **Zen Green Conformance**: All screens adhere to the Zen Green palette, typography, button hierarchy, component states, and responsive rules (Desktop, Tablet, Mobile).
- [ ] **Automated Test Suite**:
  - Supertest API test suite (`server/tests/lab-03/`) passes with 100% green status.
  - Unit test suite (`server/tests/lab-03/unit/`) passes with 100% green status.
  - Vitest UI test suite (`client/tests/lab-03/`) passes with 100% green status.
  - Playwright E2E test suite (`e2e/lab-03/`) passes across all viewports.
  - 100% test traceability to Acceptance Criteria with zero skipped or flaky tests.

---

## 12. Assumptions and Technical Decisions

1. **Authentication Protocol**: JWT Bearer token authentication stored in memory/session context with `Authorization: Bearer <token>` headers, enabling rapid API testing with Supertest and seamless integration with Vite/React.
2. **Local Lab Password Distribution**: Per Section 4.2 of the Labsheet, email delivery is excluded. The Administrator sets the initial password directly in the user modal, and `mustChangePassword = true` forces the user to reset it at first login.
3. **Requester Resolution Indication**: Modeled via `problemAppearsResolved: Boolean` and `problemAppearsResolvedAt: DateTime?` on the Ticket model. This preserves the stakeholder rule that only IT Staff can formally transition status to `RESOLVED` or `CLOSED`.
4. **Status Enum Evolution**: Lab 2 status `PENDING` is mapped to `WAITING_FOR_REQUESTER`, aligning the database with the mandatory 8 statuses.
5. **Role Responsibilities & Administrator Scope**: Administrators focus primarily on account management (`/api/admin/users`), but possess full administrative oversight permissions across ticket queue viewing, claiming, priority adjustment, and status updates as defined in the Authorization Matrix and Section 4.5 of the Labsheet.
6. **Password Change Self-Reuse & Email Sanitization**: `POST /api/auth/change-password` rejects identical password reuse (`newPassword === currentPassword`). Emails are normalized to lowercase trimmed format, and user edit uniqueness checks exclude the subject user ID.
