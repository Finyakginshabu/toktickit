# Lab 2 AI Agent Usage and Reflection

## 1. AI Agent Environment
* **AI Coding Agent / Assistant**: Antigravity IDE Coding Assistant
* **Underlying LLM**: Gemini 3.7 Flash
* **Thinking Level**: Medium
* **Course Context**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Lab 2)

---

## 2. Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| **Review Lab 2 Scope & Contracts** | "Read docs/reference/Lab_02_labsheet.pdf. Check client, server, Prisma schema, tests, package scripts, env example, and .gitignore. Report what Lab 1 has or not has, constraints from SDS, engineering contracts coverage, exclusions, and evidence gate without editing code." | The agent accurately extracted all constraints, data models, exclusions, and test requirements directly from the specification without hallucinating new scope. |
| **Draft Specification & Contract Suite** | "Draft all docs/lab-02/ contracts as specified in Labsheet (specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md). Ensure FR, BR, AC are strictly mapped and aligned." | Spec-Driven Development was reinforced by having complete, version-controlled markdown specs before beginning feature branches or code changes. |
| **Implement Development Requester Context** | "Read the Development Requester requirements, business rules, acceptance criteria, UI specification, API contract, and planned tests. Implement the temporary Lab 2 RequesterUser model, idempotent seed data, active Requester API, Development Requester Selection screen, selected Requester context, and Change Requester behavior. Clearly label this as a testing mechanism, not authentication. Do not add passwords, login, sessions, roles, or Lab 3 functionality." | [To be completed during implementation sprint] |
| **Implement Ticket Creation API & UI** | "Implement only the Create Ticket screen and reusable Zen Green form components required by the current Issue. Enforce BR-01, BR-02, BR-06, BR-07, BR-08, and BR-09 with full validation and duplicate submission guard. Preserve the API contract and do not implement My Tickets or Ticket Detail until their specification and failing tests are available." | [To be completed during implementation sprint] |
| **Implement My Tickets List & Pagination** | "Read the My Tickets requirements, API contract, acceptance criteria, and planned tests. Implement only the Requester-owned paginated ticket list, search, filters, sorting, loading, empty, no-results, and failure states. Do not add authentication or IT Staff workflow." | [To be completed during implementation sprint] |
| **Implement Requester Ticket Detail & Attachments** | "Implement the Requester Ticket Detail and Attachment lifecycle described in the contract. Ticket header fields are read-only. Enforce ownership in the backend. Support adding, downloading, and soft-removing permitted attachments. Do not add comments, internal notes, Actions Taken, or status changes." | [To be completed during implementation sprint] |
| **Verify Test Traceability & Visual Inspection** | "Audit the implementation against every acceptance criterion and planned test in docs/lab-02/tests.md. Report missing evidence, skipped tests, untested failure states, and UI-spec deviations. Run all Supertest, Vitest, and Playwright tests." | [To be completed during implementation sprint] |

---

## 3. Reflection on AI Use Experience
Working with Spec-Driven Development (Spec DD) and Test-Driven Development (Test DD) prior to prompting for implementation helped eliminate ambiguities early. Defining explicit business rules, data schemas, and API contracts in version-controlled markdown documents gave the AI agent clear boundaries, preventing scope creep and unauthorized assumptions.
