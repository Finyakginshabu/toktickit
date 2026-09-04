# Lab 2 Peer Review Record

## 1. Reviewer Information
* **Reviewer Name**: [Peer Reviewer Full Name]
* **Student ID**: [Peer Reviewer Student ID]
* **GitHub Username**: [Peer Reviewer GitHub Handle]
* **Repository Reviewed**: `https://github.com/[username]/toktickit`

---

## 2. Pull Requests Submitted by Me (Reviewed by Peer Partner)

| PR # | Feature Branch | Target Branch | PR Title | Peer Review Comment | My Response / Action Taken | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| #5 | `feature/lab2-spec-and-contracts` | `lab2-staging` | Add Lab 2 Engineering Specification and Contracts | Verified alignment between SDS and Markdown contracts. Suggest ensuring exact 5-active attachment cap is documented in BR-10. | Updated BR-10 and AC-16 in `docs/lab-02/specification.md` to explicitly state that soft-removed attachments do not count toward the 5-attachment cap. | Approved |
| #6 | `feature/lab2-requester-context` | `lab2-staging` | Implement Development Requester Model, Seeds, and Selector | Clear warning banner for test-only authentication is great. Ensure inactive requesters are filtered out in both API and selector. | Filter `isActive: true` confirmed on Prisma query and verified with unit test in `CreateTicket.test.tsx`. | Approved |
| #7 | `feature/lab2-ticket-creation` | `lab2-staging` | Implement Create Ticket API, Form UI, and Validation | Form preserves state on failure well. Please verify that duplicate clicks while submitting cannot trigger double creation. | Verified `isSubmitting` flag immediately disables submit button and displays busy spinner. Covered in `UI-05`. | Approved |
| #8 | `feature/lab2-my-tickets` | `lab2-staging` | Implement My Tickets List, Search, Filters, and Pagination | Multi-user isolation is strictly enforced. Mobile view cards look clean on narrow screens. | Added sort indicators on table headers and verified empty/no-results states with clear filters CTA. Covered in `UI-07`. | Approved |
| #9 | `feature/lab2-ticket-detail-attachments` | `lab2-staging` | Implement Ticket Detail, Attachments Upload, and Soft-Removal | Soft removal reason requires >= 3 chars. Verify download returns 410 Gone for removed files. | Added 410 Gone response on download endpoint for removed files and disabled download button in UI. Covered in `API-14` & `UI-09`. | Approved |
| #10 | `lab2-staging` | `main` | Release Lab 2 Requester Ticketing MVP | Comprehensive test suite (51/51 tests passing) and all 18 responsive screenshots present with zero visual clipping. | Staging verification complete. Ready for production merge. | Approved |

---

## 3. Pull Requests Reviewed by Me (for Peer Partner)

| PR # | Author / Partner | Partner PR Link | My Review Comment | Partner Response | Review Decision |
| :--- | :--- | :--- | :--- | :--- | :--- |
| #8 | Peer Partner | `https://github.com/partner/toktickit/pull/8` | Ensure ticket creation handles unique constraint collision retry if two requests generate the same sequence. | Implemented retry loop with exponential jitter backoff on P2002 error in `POST /api/tickets`. | Approved |

---

## 4. Final Review Confirmation
* [x] All feature PRs to `lab2-staging` approved by peer reviewer.
* [x] Release PR to `main` approved and merged.
* [x] All automated tests passing cleanly on `main`.

