# Lab 4 Test Plan and Traceability

## 1. Test Strategy

The verification strategy for Sprint 4 provides comprehensive test coverage across the full stack to ensure that Actions Taken, Resolution Gates, Dashboards, and Concurrency Controls operate reliably without causing regression in previously completed features:
1. **Unit Tests (Vitest)**: Tests isolated utility logic, calculation helpers, and validation rules:
   * Resolution Gate policy evaluator (verifying zero actions, incomplete actions, follow-up checks, and grandfathered tickets).
   * Status transition matrix validator with role and gate awareness.
   * Dashboard metric aggregation algorithms.
2. **Database Migration, Seed & Performance Smoke Tests**:
   * Migration verification: schema evolves cleanly; legacy records preserve integrity; rollback succeeds without data loss.
   * Seed idempotency: repeated execution of `npm run prisma:seed` creates zero duplicate records.
   * Performance smoke: dashboard queries execute within sub-second thresholds (<500ms).
3. **API & Integration Tests (Supertest)**: Verifies server endpoints, database transactions, RBAC permissions, and error responses in `server/tests/lab-04/`:
   * `actions-taken.api.test.ts`: CRUD for actions taken, auto-performer assignment, inactive assignee rejection, follow-up constraints, append-only cancellation, and cross-requester privacy boundary (`404 Not Found`).
   * `ticket-workflow.api.test.ts`: Resolution Gate enforcement, permitted status transitions, optimistic concurrency collisions (`409 Conflict`), and advisory requester resolution flag behavior.
   * `requester-dashboard.api.test.ts`: Verification that requester metrics and recent ticket lists only aggregate tickets owned by the authenticated requester.
   * `staff-dashboard.api.test.ts`: Verification of operational queue metrics (new, open, in progress, waiting, my assigned, unassigned, high/urgent, my open actions), admin user counts, and cross-role 403 authorization guards.
4. **UI Component, Style & Accessibility Tests (Vitest + React Testing Library)**: Verifies component rendering, field validations, modal behaviors, keyboard accessibility, and role styling in `client/tests/lab-04/`:
   * `ActionsTaken.test.tsx`: Action list rendering, create modal, conditional follow-up note field, assignee select filtering, and requester read-only mode.
   * `TicketWorkflow.test.tsx`: Resolution Gate blocking modal with dynamic checklist, resolution summary validation, and optimistic concurrency collision banner.
   * `RequesterDashboard.test.tsx`: Metric card displays, empty state, and recent tickets list.
   * `StaffDashboard.test.tsx`: Operational metric counts, drill-down routing handlers, and quick actions.
   * Accessibility assertions: Focus traps, `aria-label`, `aria-live`, and keyboard dismiss handlers.
5. **End-to-End Workflows (Playwright)**: Verifies complete cross-role browser journeys in `e2e/lab-04/`:
   * `actions-taken-flow.spec.ts`: IT Staff logs an action taken $\to$ assigns follow-up $\to$ updates status $\to$ Requester logs in and verifies read-only visibility.
   * `ticket-resolution.spec.ts`: Attempting to resolve without actions (blocked) $\to$ recording action $\to$ resolving follow-up $\to$ resolving with summary $\to$ verifying resolution.
   * `dashboards.spec.ts`: Requester dashboard metrics drill-down $\to$ IT Staff dashboard queue navigation $\to$ Admin user overview.
6. **Regression Verification**: Simultaneous execution of all Lab 1, Lab 2, and Lab 3 automated test suites to guarantee 100% backward compatibility.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | BR-09 | Resolution Gate evaluator helper | Returns false if actions=0, incomplete actions exist, or summary missing | `server/tests/lab-04/unit/resolution-gate.test.ts` | Planned |
| **UNIT-02** | Unit | BR-08 | Ticket status transition engine | Allows valid hops; rejects invalid jumps; gate-checks on RESOLVED/CLOSED | `server/tests/lab-04/unit/ticket-transitions.test.ts` | Planned |
| **UNIT-03** | Unit | BR-12, BR-13 | Dashboard calculation formula utilities | Calculates correct counts and date boundaries | `server/tests/lab-04/unit/dashboard-metrics.test.ts` | Planned |
| **MIG-01** | DB | AC-19 | Prisma schema migration & backfill | Applies cleanly; preserves legacy tickets, attachments, and users | `server/tests/lab-04/migration.test.ts` | Planned |
| **MIG-02** | DB | AC-19 | Database seed idempotency | Repeated `npm run prisma:seed` executions produce zero duplicates | `server/tests/lab-04/seed-idempotency.test.ts` | Planned |
| **PERF-01** | Perf | FR-14, FR-15 | Dashboard query performance smoke | Aggregation queries return in $< 500\text{ms}$ | `server/tests/lab-04/perf-smoke.test.ts` | Planned |
| **API-01** | API | AC-01, FR-02, BR-03 | Valid Action Taken creation by IT Staff | `201 Created`, `performedById` auto-populated with actor ID | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-02** | API | AC-02, FR-04, BR-04 | Assign Action Taken to inactive user or Requester | `400 Bad Request` (`INVALID_ASSIGNEE`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-03** | API | AC-03, FR-06, BR-06 | Create action with `followUpRequired=true` but empty `followUpNote` | `400 Bad Request` with field validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | AC-03, FR-06, BR-06 | Mark follow-up as resolved via action update | `200 OK`, `followUpResolvedAt` stamped, `followUpNote` preserved | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | AC-04, FR-01, BR-05 | Requester views Actions Taken on owned ticket | `200 OK`, returns array of actions without staff emails | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | AC-05, FR-08, BR-05 | Requester attempts `POST` / `PATCH` / `DELETE` on Actions Taken | `403 Forbidden`, operation blocked | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | AC-06, BR-05 | Requester requests actions on unowned ticket | `404 Not Found`, avoids leaking ticket existence | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-08** | API | AC-07, FR-11, BR-09 | Resolve ticket with zero Actions Taken | `400 Bad Request` (`RESOLUTION_GATE_BLOCKED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-09** | API | AC-08, FR-11, BR-09 | Resolve ticket with pending follow-up or incomplete action | `400 Bad Request` (`RESOLUTION_GATE_BLOCKED`) with action ID details | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-10** | API | AC-09, FR-11, BR-09 | Resolve ticket without `resolutionSummary` | `400 Bad Request`, non-empty summary required | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | AC-10, FR-10, BR-09 | Resolve ticket meeting all Resolution Gate criteria | `200 OK`, status set to `RESOLVED`, `resolvedAt` stamped | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-12** | API | AC-11, FR-12, BR-10 | Requester flags `problemAppearsResolved=true` | `200 OK`, flag set, but `currentStatus` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-13** | API | AC-12, FR-13, BR-11 | Stale update submission on ticket or action | `409 Conflict`, returns latest server record | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-14** | API | AC-17, FR-09 | Add or edit action on `CLOSED` or `CANCELLED` ticket | `400 Bad Request`, terminal ticket modification blocked | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-15** | API | AC-13, FR-14, BR-12 | Requester dashboard metrics retrieval & isolation | `200 OK`, metrics isolated strictly to authenticated requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-16** | API | AC-14, FR-15, BR-13 | IT Staff dashboard metrics retrieval | `200 OK`, system-wide operational counts and my open actions | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-17** | API | AC-15, FR-16, BR-14 | Admin dashboard metrics retrieval | `200 OK`, IT metrics plus user account breakdown | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-18** | API | FR-15, FR-16 | Cross-role dashboard authorization guard | Requester calling `/api/dashboard/staff` returns `403` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-19** | API | AC-20, FR-20 | Full Labs 1-3 API regression suite | `200 OK` across health, auth, comments, attachments, admin | `server/tests/lab-03/*.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, FR-02 | Actions Taken table rendering and Add Action modal | Form inputs validate and auto-populate performer | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | AC-02, BR-04 | Assignee dropdown excludes inactive users and Requesters | Select options contain only active IT Staff and Admins | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-03** | UI | AC-03, BR-06 | Follow-up checkbox toggles required Follow-up Note input | Note input shows asterisk and validation message if empty | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04** | UI | AC-04, AC-05 | Requester Ticket Detail Actions Taken view | Read-only table shown; "Add Action" and edit buttons absent | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-05** | UI | AC-07, AC-08, AC-09 | Resolution Gate checklist modal rendering | Modal displays itemized passing/failing criteria dynamically | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-06** | UI | AC-10, FR-10 | Successful resolution flow with summary input | Advances ticket status to RESOLVED and updates badge | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-07** | UI | AC-12, BR-11 | Optimistic concurrency conflict modal | Displays conflict notification and preserves user inputs | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-08** | UI | AC-13, FR-14 | Requester dashboard card rendering and empty states | Cards show correct numbers; empty list displays helpful CTA | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-09** | UI | AC-14, FR-15 | Staff dashboard operational metric cards and recent list | Cards show counts, open actions, and link to filtered queues | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-10** | UI | AC-15, FR-16 | Admin dashboard user summary stats | Displays total, active, and role breakdown counts | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-11** | UI | AC-16, BR-15 | Dashboard drill-down navigation link click | Navigates to queue/tickets with corresponding filters | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-12** | UI | FR-19, AC-18 | Double-click prevention and in-flight busy state | Buttons disable and spin during request | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **A11Y-01**| UI | Section 6 | Accessibility & keyboard navigation check | Modal traps focus; ARIA labels present on all cards | `client/tests/lab-04/Accessibility.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-04 | Actions Taken logging and cross-role visibility flow | Staff creates action $\to$ Requester logs in and views action | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-07, AC-08, AC-10 | Complete Resolution Gate workflow | Blocked resolution $\to$ work completion $\to$ successful resolution | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-03** | E2E | AC-13, AC-14, AC-16 | Role Dashboards & drill-down end-to-end journey | Dashboard load $\to$ card click $\to$ pre-filtered queue verification | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **E2E-04** | E2E | AC-20, FR-20 | Full regression end-to-end suite (Labs 1-3) | Login, password change, ticket submission, comments, admin | `e2e/lab-03/*.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Primary Automated Tests | Description |
| :--- | :--- | :--- |
| **AC-01** (Valid Action Taken) | `API-01`, `UI-01`, `E2E-01` | Action Taken created by IT Staff with auto-performer attribution. |
| **AC-02** (Inactive Assignee Reject) | `API-02`, `UI-02` | Assigning action to inactive user or Requester is rejected. |
| **AC-03** (Follow-Up Validation & Resolve) | `API-03`, `API-04`, `UI-03` | Follow-up note required; can be resolved without deleting note. |
| **AC-04** (Requester Action View) | `API-05`, `UI-04`, `E2E-01` | Requester has read-only view of actions on owned ticket. |
| **AC-05** (Requester Write Block) | `API-06`, `UI-04` | Requesters forbidden from creating or modifying actions. |
| **AC-06** (Unowned Action Privacy) | `API-07` | Accessing actions for unowned ticket returns `404 Not Found`. |
| **AC-07** (Resolution Gate - 0 Actions)| `API-08`, `UI-05`, `E2E-02` | Resolving with zero actions taken is rejected. |
| **AC-08** (Resolution Gate - Incomplete)| `API-09`, `UI-05`, `E2E-02` | Resolving with pending follow-up or in-progress action is rejected. |
| **AC-09** (Resolution Gate - No Summary)| `API-10`, `UI-05` | Resolving without resolution summary is rejected. |
| **AC-10** (Resolution Gate - Success) | `API-11`, `UI-06`, `E2E-02` | Resolving meeting all gate conditions succeeds. |
| **AC-11** (Advisory Requester Flag) | `API-12` | Requester resolution indication does not advance formal status. |
| **AC-12** (Optimistic Concurrency) | `API-13`, `UI-07` | Stale update returns `409 Conflict` with latest record. |
| **AC-13** (Requester Dashboard) | `API-15`, `UI-08`, `E2E-03` | Aggregates only authenticated requester's tickets and counts. |
| **AC-14** (IT Staff Dashboard) | `API-16`, `UI-09`, `E2E-03` | Operational counts, my open actions, and recent tickets. |
| **AC-15** (Admin User Metrics) | `API-17`, `UI-10` | Extends staff metrics with user account statistics. |
| **AC-16** (Drill-Down Navigation) | `UI-11`, `E2E-03` | Metric card click routes to queue with pre-selected filters. |
| **AC-17** (Locked Terminal Tickets) | `API-14` | Adding or editing actions on closed/cancelled tickets is blocked. |
| **AC-18** (Double-Click Prevention) | `UI-12` | Buttons disable and show spinner while requests are in-flight. |
| **AC-19** (Migration & Seed Idempotency)| `MIG-01`, `MIG-02` | Schema evolves safely; seed creates zero duplicates on re-run. |
| **AC-20** (Full System Regression) | `API-19`, `E2E-04` | 100% passing tests across all Lab 1, 2, and 3 suites. |

---

## 4. Responsive & Visual Inspection Checklist

* [ ] **Dashboard Desktop Layout ($\ge 992\text{px}$)**: 5-card metric row, side-by-side recent tickets and quick action column.
* [ ] **Dashboard Tablet Layout ($768 - 991\text{px}$)**: 2–3 card metric grid, stacked quick action card.
* [ ] **Dashboard Mobile Layout ($< 768\text{px}$)**: Single column stacked metric cards, full-width touch buttons.
* [ ] **Actions Taken Table & Mobile Cards**: Multi-column table on desktop; wraps into accessible cards on mobile without horizontal scrolling.
* [ ] **Resolution Gate Guidance**: Modal displays clear, accessible checklist of pending requirements before resolving.
* [ ] **In-Flight Busy States**: Submit buttons disable and show spinner while requests are pending.
* [ ] **Form Data Retention**: Recoverable validation failures retain entered textarea and dropdown state.
* [ ] **Color Contrast & Keyboard Navigation**: Focus outlines visible on all cards, links, and buttons; non-color cues on status badges.

---

## 5. Test Execution Commands

```bash
# 1. Run all unit, migration, and API tests in server
npm run test:server

# 2. Run all client component and accessibility tests
npm run test:client

# 3. Run Playwright E2E tests for Lab 4
npx playwright test e2e/lab-04

# 4. Run entire full-stack test suite across Labs 1-4
npm run test:all
```
