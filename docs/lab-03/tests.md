# Lab 3 Test Plan and Traceability

## 1. Test Strategy

The verification strategy for Lab 3 tests security, role isolation, regression, and end-to-end workflows across the entire stack:
1. **API & Authorization Tests (Supertest)**: Verifies password hashing, token issue and invalidation, mandatory password change enforcement, role-based endpoint protection, ticket claim/reassign logic, status transition boundaries, append-only comments/notes, and admin safety guards in `server/tests/lab-03/`.
2. **UI Component & State Tests (Vitest + RTL)**: Tests client form validations, password checklists, role-conditional navigation, queue filters, status transition selectors, and note confidentiality in `client/tests/lab-03/`.
3. **End-to-End Workflows (Playwright)**: Verifies complete cross-role journeys (Authentication $\to$ Password Change, IT Staff Ticket triage, Admin User management) across Desktop, Tablet, and Mobile in `e2e/lab-03/`.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-01, BR-01 | Valid user authentication | `200 OK`, valid JWT token and sanitized profile | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-02** | API | AC-05, FR-02, BR-01 | Login with invalid credentials or inactive account | `401 Unauthorized` with safe generic error | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-03** | API | AC-06, FR-04 | User logout invalidation | `200 OK`, subsequent protected calls return `401` | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-04** | API | AC-02, FR-03, BR-02 | First-login password change | `200 OK`, `mustChangePassword` reset to `false` | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-05** | API | AC-03, FR-06, BR-03 | Requester ticket ownership boundary | Requester can only access owned tickets | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **API-06** | API | AC-04, FR-14, BR-16 | Requester attempts to access Internal Notes | `403 Forbidden`, no note data returned | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **API-07** | API | AC-24, FR-15 | Non-Admin attempts to access user admin API | `403 Forbidden` | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **API-08** | API | AC-10, FR-08 | IT Staff Ticket Queue retrieval & filters | `200 OK`, paginated tickets with category/status filters | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-09** | API | AC-11, FR-10 | Claim unassigned ticket by IT Staff | `200 OK`, `ticketOwnerId` set, status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-10** | API | AC-12, FR-10 | Reassign ticket ownership to another staff | `200 OK`, new owner persisted | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-11** | API | AC-13, FR-11, BR-12 | Update IT Priority independently | `200 OK`, `itPriority` changed, `requestedPriority` unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-12** | API | AC-14, FR-12, BR-14 | Permitted status transition (OPEN $\to$ IN_PROGRESS) | `200 OK`, status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-13** | API | AC-15, FR-12, BR-14 | Invalid status transition (NEW $\to$ CLOSED) | `400 Bad Request`, status transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-14** | API | AC-09, FR-07, BR-05 | Requester indicates problem appears resolved | `200 OK`, `problemAppearsResolved = true` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-15** | API | AC-16, FR-13, BR-15 | Post and retrieve Public Comments | `201 Created` / `200 OK`, comment visible to all | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-16** | API | AC-17, FR-14, BR-15 | Post and retrieve Internal Notes | `201 Created` / `200 OK`, notes visible to staff only | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-17** | API | AC-18, FR-15 | Admin lists users with search and filter | `200 OK`, user list matching criteria | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-18** | API | AC-19, FR-16, BR-07 | Admin creates new user with initial password | `201 Created`, `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-19** | API | AC-20, FR-17 | Admin edits user details | `200 OK`, updated name/role persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-20** | API | AC-21, FR-19, BR-08 | Admin attempts self-deactivation | `400 Bad Request`, operation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-21** | API | AC-22, FR-19, BR-09 | Admin deactivates last active Admin | `400 Bad Request`, operation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-22** | API | AC-23, FR-18, BR-17 | Admin resets user initial password | `200 OK`, `mustChangePassword = true` set | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, AC-05 | Login screen form validation and error states | Inline errors on empty inputs; generic alert on failure | `client/tests/lab-03/Login.test.tsx` | Planned |
| **UI-02** | UI | AC-02, BR-02 | Change Password complexity checklist | Shows checklist satisfaction and enables submit | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| **UI-03** | UI | AC-07, FR-05 | Role-based header navigation rendering | Verifies distinct navigation tabs per user role | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **UI-04** | UI | AC-10, FR-08 | Staff Ticket Queue filter, search, and pagination | Queue updates correctly on filter interactions | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **UI-05** | UI | AC-11, AC-13 | Staff Ticket Detail ownership & priority controls | Claim button and priority change trigger correct states | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **UI-06** | UI | AC-16, AC-17 | Comments vs Notes distinct visual rendering | Notes panel displayed with security warning styling | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **UI-07** | UI | AC-18, AC-21 | Admin User Management table and safety modals | Deactivate button disabled on current user row | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-02, AC-06 | Authentication & First Login Password Flow | Login $\to$ forced change $\to$ dashboard access $\to$ logout | `e2e/lab-03/authentication.spec.ts` | Planned |
| **E2E-02** | E2E | AC-10, AC-11, AC-14 | IT Staff End-to-End Queue & Ticket Triage Flow | Queue view $\to$ claim ticket $\to$ prioritize $\to$ status | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| **E2E-03** | E2E | AC-18, AC-19, AC-23 | Administrator User Management Lifecycle Flow | Create user $\to$ reset password $\to$ verify login | `e2e/lab-03/user-administration.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Covered By Automated Tests | Description |
| :--- | :--- | :--- |
| **AC-01** (Valid Auth) | `API-01`, `UI-01`, `E2E-01` | Valid login returns token, user identity, and role. |
| **AC-02** (Password Change) | `API-04`, `UI-02`, `E2E-01` | First-login password change blocks normal access until resolved. |
| **AC-03** (Ownership Bound) | `API-05` | Requester identity enforces ownership over ticket access. |
| **AC-04** (Notes Forbidden)| `API-06` | Requesters blocked from internal notes without leaking content. |
| **AC-05** (Invalid Login) | `API-02`, `UI-01` | Bad credentials or inactive account returns generic safe error. |
| **AC-06** (Logout) | `API-03`, `E2E-01` | Logout invalidates session and redirects to login. |
| **AC-07** (Role Navigation) | `UI-03` | Application shell displays only permitted role links. |
| **AC-08** (Requester Regress)| `API-05` | Lab 2 ticket creation, search, and attachments continue working. |
| **AC-09** (Problem Resolved)| `API-14` | Requester indicates problem resolved without changing formal status. |
| **AC-10** (Staff Queue) | `API-08`, `UI-04`, `E2E-02` | Queue displays tickets with search, filters, and pagination. |
| **AC-11** (Claim Ticket) | `API-09`, `UI-05`, `E2E-02` | Unassigned tickets claimed by IT Staff and moved to OPEN. |
| **AC-12** (Reassign Owner) | `API-10` | Tickets reassigned to another active staff member. |
| **AC-13** (IT Priority) | `API-11`, `UI-05`, `E2E-02` | IT Priority updated independently of Requested Priority. |
| **AC-14** (Status Transition)| `API-12`, `E2E-02` | Permitted transitions advance ticket workflow. |
| **AC-15** (Invalid Status) | `API-13` | Prohibited transitions rejected with HTTP 400. |
| **AC-16** (Public Comments) | `API-15`, `UI-06` | Append-only public comments visible to Requester and Staff. |
| **AC-17** (Internal Notes) | `API-16`, `UI-06` | Append-only internal notes visible only to Staff and Admin. |
| **AC-18** (User Listing) | `API-17`, `UI-07`, `E2E-03` | Admin lists users with search and role filters. |
| **AC-19** (User Creation) | `API-18`, `E2E-03` | Admin creates user with initial password and forced reset flag. |
| **AC-20** (User Editing) | `API-19` | Admin edits user name, email, role, and activation status. |
| **AC-21** (Self-Deactivate) | `API-20`, `UI-07` | Admin self-deactivation blocked by backend and UI. |
| **AC-22** (Last Admin Guard)| `API-21` | Deactivating the sole active Admin is blocked. |
| **AC-23** (Password Reset) | `API-22`, `E2E-03` | Admin sets new initial password with forced change on next login. |
| **AC-24** (Admin RBAC) | `API-07` | Non-Admin access to User Management returns HTTP 403. |

---

## 4. Responsive & Visual Checklist

* [ ] **Design Consistency**: Verified Zen Green color tokens across header, buttons, cards, and text.
* [ ] **Role Navigation**: Navigation bar shows only permitted items for Requester, IT Staff, and Admin.
* [ ] **Badge Consistency**: Status, Priority, and Role badges conform to color and typography rules.
* [ ] **Field Styling**: Clear visual distinction between editable (white) and read-only (soft ivory/gray-green) inputs.
* [ ] **Validation Placement**: Inline error messages appear directly below their associated input fields.
* [ ] **Focus & Accessibility**: Focus rings visible on keyboard tab navigation; buttons have high contrast.
* [ ] **No Clipping or Overlap**: Text labels, badges, and modals do not clip or overlap across viewport sizes.
* [ ] **Horizontal Overflow**: Zero horizontal scrollbars on Desktop ($\ge 992\text{px}$), Tablet ($768\text{px} - 991\text{px}$), and Mobile ($< 768\text{px}$).

---

## 5. Test Commands

* Run Server API Tests: `npm run test --prefix server`
* Run Client UI Tests: `npm run test --prefix client`
* Run Playwright E2E Tests: `npx playwright test e2e/lab-03`
* Run Complete Suite: `npm run test:all`
