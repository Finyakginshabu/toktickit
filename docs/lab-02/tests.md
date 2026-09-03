# Lab 2 Test Plan and Traceability

## 1. Test Strategy
Testing for Lab 2 follows a multi-layered verification strategy combining automated and visual tests:
1. **API Integration Tests (Supertest)**: Verifies all REST endpoints in `server/tests/lab-02/`, checking HTTP status codes, payload structures, database persistence, validation constraints, attachment limits, soft-deletion mechanics, and multi-tenant requester isolation.
2. **UI Component & State Tests (Vitest + React Testing Library)**: Tests individual client views in `client/tests/lab-02/`, verifying form validation, character counters, file dropzone rejection, submit button busy state, empty/no-results states, and requester context switching.
3. **End-to-End & Responsive Tests (Playwright)**: Verifies end-to-end user workflows in `e2e/lab-02/` across desktop (1280×800), tablet (768×1024), and mobile (375×667) viewports, verifying visual layout fidelity and capturing screenshot evidence.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-04, BR-01 | Create valid ticket with all required fields | `201 Created`, unique `TKT-YYYY-XXXXXX` generated, status `NEW` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-02** | API | AC-02, BR-06 | Create ticket with missing summary or short description | `400 Bad Request` with field validation errors | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03** | API | AC-03, BR-09 | Create ticket with 2 valid attachments (PNG, PDF) | `201 Created`, attachments persisted on disk & DB | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | AC-04, BR-09 | Create ticket with attachment exceeding 5 MB or 0-byte | `413 Payload Too Large` or `400 Bad Request`, ticket not created | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-05** | API | AC-08, BR-04 | Retrieve Requesters endpoint | `200 OK`, returns only active requesters (`isActive = true`) | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-06** | API | AC-10, BR-05 | Retrieve My Tickets for Requester A | `200 OK`, returns only tickets where `requesterId == A` | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | AC-11, FR-09 | My Tickets search query and category filter | `200 OK`, returns filtered subset matching keyword & category | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | API | AC-11, FR-10 | My Tickets pagination metadata and sorting | `200 OK`, returns requested page, page size, total pages | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-09** | API | AC-13, FR-11 | Retrieve owned Ticket Detail | `200 OK`, returns complete header, requester info, attachments | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-10** | API | AC-14, BR-05 | Requester A requests Requester B's ticket | `403 Forbidden` or `404 Not Found` | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-11** | API | AC-15, FR-14 | Add new attachment to existing owned ticket | `201 Created`, attachment added to ticket | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-12** | API | AC-16, BR-10 | Add 6th active attachment to ticket with 5 attachments | `400 Bad Request`, upload rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-13** | API | AC-17, BR-11 | Soft-remove attachment with reason | `200 OK`, `isRemoved = true`, `removedReason` saved | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-14** | API | AC-18, BR-12 | Download soft-removed attachment binary | `410 Gone` or `404 Not Found`, download blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | UI | AC-07, AC-08 | Development Requester selector renders and selects user | Selector renders active users only; selection updates context | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-02** | UI | AC-09, FR-02 | Change Requester action updates application shell | Header reflects new requester and triggers data reload | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-03** | UI | AC-02, BR-06 | Create Ticket form client validation on empty submit | Displays inline error messages under Summary and Description | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | UI | AC-04, BR-09 | Create Ticket file dropzone rejects >5MB and invalid type | Displays attachment error badge, disables submission | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | UI | AC-05, BR-08 | Create Ticket submit button displays busy state | Button disabled with "Submitting..." spinner during request | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-06** | UI | AC-06, BR-07 | Backend offline preserves entered form values | Error banner displayed; summary and description retained | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-07** | UI | AC-10, AC-12 | My Tickets renders table, empty state, and no-results state | Renders correct UI states based on API response | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-08** | UI | AC-13, AC-14 | Ticket Detail renders read-only fields and unauthorized alert | Header fields disabled; cross-access shows error alert | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| **UI-09** | UI | AC-15, AC-17 | Attachment Section handles add, download, and soft-removal | Renders active/removed items, enforces 5-cap, captures reason | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-10 | Full Requester journey: Select user -> Create ticket -> View in My Tickets | Ticket created, unique number generated, listed in dashboard | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-09, AC-10 | Multi-user isolation journey: Switch Requester A to B | Requester A tickets disappear when switching to Requester B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-03** | E2E | AC-15, AC-17 | Attachment lifecycle journey: Add, download, soft-remove | File uploaded, downloaded, soft-removed with reason | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Covered By Tests | Description |
| :--- | :--- | :--- |
| **AC-01** (Valid Creation) | `API-01`, `UI-05`, `E2E-01` | Valid ticket creation generates unique `TKT-YYYY-XXXXXX` and status `NEW`. |
| **AC-02** (Validation Failure) | `API-02`, `UI-03` | Missing/invalid fields blocked with field-level messages. |
| **AC-03** (Attachment Upload) | `API-03`, `E2E-01` | Valid attachments uploaded and stored with ticket. |
| **AC-04** (Invalid Attachment) | `API-04`, `UI-04` | Oversized (>5MB), 0-byte, or invalid extension files rejected. |
| **AC-05** (Duplicate Guard) | `UI-05`, `E2E-01` | Busy spinner and disabled state prevent multi-clicks. |
| **AC-06** (Offline Preservation)| `UI-06` | Backend errors display banner while preserving input values. |
| **AC-07** (Requester Selector)| `UI-01`, `E2E-01` | Prompts for Development Requester context if unset. |
| **AC-08** (Active Requester Only)| `API-05`, `UI-01` | Inactive requesters excluded from selector. |
| **AC-09** (Context Switching) | `UI-02`, `E2E-02` | Switching user refreshes context and ticket list. |
| **AC-10** (Ownership Isolation) | `API-06`, `UI-07`, `E2E-02` | Requester sees only their own tickets in My Tickets. |
| **AC-11** (Search & Filter) | `API-07`, `UI-07` | Keyword search and faceted filters filter tickets. |
| **AC-12** (Empty / No-Results) | `UI-07` | Meaningful 0-ticket and no-filter-match states. |
| **AC-13** (Ticket Detail View)| `API-09`, `UI-08` | Read-only header and attachment inspection. |
| **AC-14** (Cross-Access Block)| `API-10`, `UI-08` | 403/404 on accessing another requester's ticket. |
| **AC-15** (Add Attachment) | `API-11`, `UI-09`, `E2E-03` | Upload additional attachment to existing ticket. |
| **AC-16** (Attachment Cap) | `API-12`, `UI-09` | Max 5 active attachments per ticket strictly enforced. |
| **AC-17** (Soft Removal) | `API-13`, `UI-09`, `E2E-03` | Soft removal marks file removed and saves reason. |
| **AC-18** (Blocked Download) | `API-14`, `UI-09`, `E2E-03` | Download blocked (410 Gone) for soft-removed file. |
| **AC-19** (Responsive / Zen) | `E2E-01`, `E2E-02` | Zen Green tokens and responsive layouts across viewports. |

---

## 4. Responsive & Visual Checklist

* [ ] **Color Tokens**: Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Background (`#F5F7F6`).
* [ ] **Form Styling**: White editable inputs with neutral borders; soft ivory read-only inputs in Ticket Detail.
* [ ] **Validation Alignment**: Inline red text (`#C53030`) rendered directly below each corresponding input.
* [ ] **Button Hierarchy**: Primary action has solid green fill with hover state; destructive actions styled with red border/text.
* [ ] **Desktop Viewport (≥ 992px)**: Two-column forms, full data table in My Tickets, no horizontal scrollbar.
* [ ] **Tablet Viewport (768–991px)**: Responsive container margins, data table maintains accessible touch scroll.
* [ ] **Mobile Viewport (< 768px)**: Single-column vertical form stacking, My Tickets transforms into clean stacked cards.

---

## 5. Test Commands

### 5.1. Running Server API Tests
```bash
cd server
npm test -- tests/lab-02
```

### 5.2. Running Client UI Tests
```bash
cd client
npm test -- tests/lab-02
```

### 5.3. Running Playwright End-to-End Tests
```bash
npx playwright test e2e/lab-02
```

---

## 6. Final Results
*(To be populated with test run output upon execution completion)*

---

## 7. Known Limitations or Deferred Tests
* Full authentication token tests, password reset flows, and role permission tests are deferred to Lab 3.
* IT Staff ticket claiming, priority reassignment, and public/internal comment tests are deferred to Lab 3 and Lab 4.
