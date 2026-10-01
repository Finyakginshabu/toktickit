# Lab 4 UI Specification: Zen Green System, Dashboards & Actions Taken

## 1. Visual Theme & Design Tokens

TokTickIT preserves and hardens the **Zen Green Design System** established in Lab 2 and extended in Lab 3. The entire application presents a consistent, professional, high-contrast, and tranquil aesthetic across all user roles (Requester, IT Staff, Administrator).

### 1.1. Color Tokens
| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | App header background, primary action buttons, active focus accents, strong brand emphasis. |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, subheadings, hover accents, secondary interactive highlights. |
| `--color-pale-green` | `#EAF6EF` | Selected table rows, positive card fills, subtle section card backdrops. |
| `--color-page-bg` | `#F5F7F6` | Quiet off-white backdrop across all views and viewports. |
| `--color-surface-card` | `#FFFFFF` | Metric cards, container cards, table wrappers, dialog modals. |
| `--color-text-main` | `#1C2A22` | High-contrast dark charcoal-green typography for primary reading text. |
| `--color-text-muted` | `#5C6F64` | Subtitles, helper captions, timestamps, placeholder text. |
| `--color-border-neutral` | `#D8E2DC` | Default card borders, input borders, table row dividers. |
| `--color-input-bg-editable` | `#FFFFFF` | Background for interactive, editable form controls. |
| `--color-input-bg-readonly` | `#EFEFEA` | Soft warm-ivory / gray-green background for read-only fields and auto-filled data. |
| `--color-action-item-bg` | `#F9FBF9` | Alternating card/row background for Actions Taken line items. |
| `--color-internal-note-bg` | `#FFFDF0` | Soft warm amber-ivory background for restricted Internal Notes card. |
| `--color-internal-note-border` | `#ECC94B` | Distinct amber border accent identifying restricted Internal Notes. |
| `--color-error` | `#C53030` | Red validation errors, danger badges, destructive buttons, critical alerts. |
| `--color-error-bg` | `#FFF5F5` | Background tint for error callouts and conflict warnings. |
| `--color-warning` | `#975A16` | High-contrast amber text for warnings and follow-up tags (meeting WCAG AA contrast). |
| `--color-warning-bg` | `#FEFCBF` | Soft yellow/amber background tint for warning badges and callouts. |
| `--color-success` | `#22543D` | Positive status badges, confirmation notices, online status cues. |
| `--color-success-bg` | `#F0FFF4` | Background tint for success confirmation banners. |

### 1.2. Typography & Spacing
* **Font Family**: System font stack (`system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
* **Scale**:
  * Page Title / H1: `1.75rem` (28px), Bold (`700`), `--color-text-main`
  * Section Header / H2: `1.25rem` (20px), Semi-bold (`600`)
  * Card Header / H3: `1.1rem` (17.6px), Medium (`500`)
  * Body Text: `0.9375rem` (15px), Regular (`400`), Line-height `1.5`
  * Helper / Caption: `0.8125rem` (13px), Regular (`400`), `--color-text-muted`
* **Spacing Scale**:
  * `xs`: `4px`, `sm`: `8px`, `md`: `16px`, `lg`: `24px`, `xl`: `32px`

### 1.3. Iconography Standards
* **Icon Library**: **Google Material Symbols Outlined** (`.material-symbols-outlined`) loaded from Google Fonts.
* **Standard Semantic Icons**:
  * Navigation: `dashboard` (Dashboard), `assignment` (My Tickets), `inbox` / `view_list` (Ticket Queue), `add_circle` (Create Ticket), `manage_accounts` (User Management)
  * Actions & Controls: `refresh`, `search`, `arrow_forward`, `check_circle`, `warning`, `error`, `info`, `edit`, `delete`, `download`, `upload_file`, `lock`

### 1.4. Role Badges
* **Requester**: Pale green pill (`bg: #EAF6EF, text: #006B3C, border: 1px solid #B8E2C8`).
* **IT Staff**: Primary green pill (`bg: #006B3C, text: #FFFFFF, border: 1px solid #00502D`).
* **Administrator**: Slate charcoal pill (`bg: #2D3748, text: #FFFFFF, border: 1px solid #D69E2E`).

### 1.5. Status & Priority Badges
* **Ticket Status Badges**:
  * `NEW`: Blue badge (`bg: #EBF8FF, text: #2B6CB0, border: 1px solid #BEE3F8`)
  * `OPEN`: Cyan badge (`bg: #E6FFFA, text: #234E52, border: 1px solid #B2F5EA`)
  * `IN_PROGRESS`: Amber badge (`bg: #FEEBC8, text: #7B341E, border: 1px solid #FBD38D`)
  * `WAITING_FOR_REQUESTER`: Purple badge (`bg: #FAF5FF, text: #553C9A, border: 1px solid #E9D8FD`)
  * `RESOLVED`: Green badge (`bg: #C6F6D5, text: #22543D, border: 1px solid #9AE6B4`)
  * `CLOSED`: Gray badge (`bg: #EDF2F7, text: #4A5568, border: 1px solid #CBD5E0`)
  * `REOPENED`: Warm Orange badge (`bg: #FFEDD5, text: #9A3412, border: 1px solid #FDBA74`)
  * `CANCELLED`: Red badge (`bg: #FED7D7, text: #9B2C2C, border: 1px solid #FEB2B2`)
* **Action Taken Status Badges**:
  * `PENDING`: Slate Gray pill (`bg: #EDF2F7, text: #4A5568, border: 1px solid #CBD5E0`)
  * `IN_PROGRESS`: Amber pill (`bg: #FEEBC8, text: #7B341E, border: 1px solid #FBD38D`)
  * `COMPLETED`: Green pill (`bg: #C6F6D5, text: #22543D, border: 1px solid #9AE6B4`)
  * `CANCELLED`: Red pill (`bg: #FED7D7, text: #9B2C2C, border: 1px solid #FEB2B2`)
* **Priority Badges**:
  * `LOW`: Slate Gray fill (`bg: #EDF2F7, text: #4A5568`)
  * `MEDIUM`: Soft Yellow fill (`bg: #FEFCBF, text: #744210`)
  * `HIGH`: Amber fill (`bg: #FEEBC8, text: #7B341E`)
  * `URGENT`: Crimson fill (`bg: #FED7D7, text: #9B2C2C`)

---

## 2. Component Design & State Rules

### 2.1. Form Controls & Field States
* **Label Placement**: Labels are always positioned immediately above input controls with `font-weight: 500` and `margin-bottom: 6px`.
* **Required Field Marker**: A red asterisk (`*`, color `#C53030`) follows the label text. The asterisk does not replace clear validation messages.
* **Control Height**: Standard single-line controls (`<input>`, `<select>`) have a height of `42px`.
* **Multiline Textarea**: Minimum height `120px` (or `90px` in modals), resizable vertically only without layout breaking.
* **Field State Matrix**:
  * **Default / Idle**: White background, `1px solid #D8E2DC`, rounded corners `6px`.
  * **Focus**: `1px solid #006B3C` with outline `box-shadow: 0 0 0 3px rgba(0, 107, 60, 0.2)`.
  * **Invalid / Error**: `1px solid #C53030`, with a validation message rendered directly below the control in `#C53030` (`font-size: 13px`).
  * **Read-Only**: Background `#EFEFEA`, border `1px solid #D8E2DC`, text `#2D3748`, cursor `default`.
  * **Disabled**: Background `#E2E8F0`, border `1px solid #CBD5E0`, text `#A0AEC0`, cursor `not-allowed`.

### 2.2. Button Hierarchy & Interactive States
1. **Primary Action** (`.btn-zen-primary`):
   * Background `#006B3C`, text `#FFFFFF`, border `none`, padding `8px 20px`, border-radius `6px`.
   * Hover: `#0B7A46`. Active: `#00502D`.
   * Busy/Loading: Inline animated spinner (`.spinner-border-sm`), text changes (e.g. "Saving..."), `pointer-events: none`, opacity `0.75`.
2. **Secondary Action** (`.btn-zen-secondary`):
   * Background `#FFFFFF`, text `#006B3C`, border `1px solid #006B3C`.
   * Hover: Background `#EAF6EF`.
3. **Destructive Action** (`.btn-zen-destructive` / `.btn-zen-danger`):
   * Background `#FFFFFF`, text `#C53030`, border `1px solid #C53030`.
   * Hover: Background `#FFF5F5`.
4. **Disabled Action**:
   * Background `#E2E8F0`, text `#A0AEC0`, border `1px solid #CBD5E0`, cursor `not-allowed`.

---

## 3. Application Shell & Navigation

* **Header Navigation (`AppHeader.tsx`)**:
  * **Top Bar**: Solid `#006B3C` background with white TokTickIT brand logo.
  * **Role-Specific Canonical Tabs**:
    * **Requester**: *Dashboard* (`/dashboard`), *My Tickets* (`/my-tickets`), *Create Ticket* (`/create-ticket`).
    * **IT Staff**: *Dashboard* (`/staff/dashboard`), *Ticket Queue* (`/staff/queue`), *Create Ticket* (`/create-ticket`).
    * **Administrator**: *Dashboard* (`/admin/dashboard`), *Ticket Queue* (`/staff/queue`), *User Management* (`/admin/users`), *Create Ticket* (`/create-ticket`).
  * **Active Tab Style**: High-contrast white border bottom (`border-bottom: 3px solid #FFFFFF`), bold font.
  * **User Profile & Session Controls**:
    * Displays authenticated user's name and role badge.
    * Logout button: Outlined button with sign-out icon. Clicking immediately ends session and redirects to Login.

---

## 4. Screen Specifications

### 4.1. IT Staff Dashboard Screen (`StaffDashboard.tsx`)
*(Reference: SE Lab 4 Handout Figure on Page 5)*
* **Header Greeting**:
  * Title: "Welcome back, {User Name}!"
  * Subtitle: "Here's what's happening with your queue today."
  * Right Action: `↻ Refresh` button with spinning animation during fetch.
* **Operational Metric Cards Row**:
  * 5 primary metric cards laid out horizontally on desktop:
    1. **New**: Total tickets with `currentStatus = NEW`.
    2. **Open**: Total tickets with `currentStatus = OPEN`.
    3. **In Progress**: Total tickets with `currentStatus = IN_PROGRESS`.
    4. **Waiting for Requester**: Total tickets with `currentStatus = WAITING_FOR_REQUESTER`.
    5. **My Assigned**: Total active tickets where `ticketOwnerId = me`.
  * **Daily Velocity Delta Display (§6.2 & Handout Page 5)**:
    * Rendered immediately beneath the main numeric count on each primary card:
      * **Positive Trend ($\Delta > 0$)**: Formatted as `+N from yesterday` in emerald green (`#22543D`, `--color-success`), `font-weight: 500`, `font-size: 0.8125rem` (13px), with small upward indicator `▲`.
      * **Negative Trend ($\Delta < 0$)**: Formatted as `-N from yesterday` in muted steel blue (`#2B6CB0`), `font-weight: 500`, `font-size: 0.8125rem` (13px), with small downward indicator `▼`.
      * **Neutral / Zero ($\Delta = 0$)**: Formatted as `0 from yesterday` in muted gray (`#5C6F64`, `--color-text-muted`), `font-size: 0.8125rem` (13px).
  * Secondary indicators bar:
    * **Unassigned Tickets**: Count highlighted with amber warning icon.
    * **High / Urgent Priority**: Count highlighted with crimson indicator.
    * **My Open Actions**: Count of active actions assigned to or performed by the current staff member (`myOpenActionsCount`).
  * **Card Interaction & Drill-Down**:
    * Each card has an accessible ARIA label (e.g. `aria-label="New tickets: 14, +1 from yesterday. Click to view list"`).
    * Clicking any card routes to the Ticket Queue with filter pre-selected (e.g. clicking *My Assigned* navigates to `/staff/queue?ownerId=me`).
* **Main Content Split (2:1 Ratio)**:
  * **Left Column - "Recent Tickets"**:
    * Card header: "Recent Tickets" with a "View all" link to `/staff/queue`.
    * Table columns: Ticket Number, Summary, Status badge, Priority badge, Last Updated.
    * Hover highlight on table rows; clicking a row opens the Ticket Detail.
    * Empty state: "No recent tickets in queue."
  * **Right Column - "Quick Actions"**:
    * Action tiles:
      * `Create Ticket`: Routes to ticket submission.
      * `Search Tickets`: Navigates to queue with search focused.
      * `My Queue`: Pre-filters queue to tickets owned by current user.
      * `Unassigned Queue`: Pre-filters queue to unassigned tickets.
* **Dashboard States (§8.1 Mandatory States)**:
  * **Loading**: Metric card skeletons with pulsing shimmer animation; table displays 5 placeholder skeleton rows.
  * **Empty State**: Zero metrics display `0` with neutral trend `0 from yesterday` and helpful queue-cleared text ("All caught up! No open tickets in this queue.").
  * **Forbidden State (403)**:
    * Displayed when a user without IT Staff or Administrator roles attempts to view `/staff/dashboard` or `/admin/dashboard`.
    * Centered card container with slate lock icon (`lock` from Material Symbols, color `#4A5568`).
    * Title: "403 - Access Forbidden" (`font-size: 1.5rem`, `font-weight: 700`, `--color-text-main`).
    * Message: "You do not have the required permissions to view this operational dashboard. Access is restricted to authorized IT Staff and Administrators."
    * Action Button: Primary green button "Return to My Dashboard" (`.btn-zen-primary`) navigating back to `/dashboard`.
  * **Safe Failure**: Alert banner if backend is unreachable with a "Retry" button. Form inputs and active filters are preserved.

### 4.2. Requester Dashboard Screen (`RequesterDashboard.tsx`)
*(Reference: SE Lab 4 Handout Figure on Page 6)*
* **Header Greeting**:
  * Title: "Welcome, {User Name}!"
  * Subtitle: "Here's the latest on your requests."
* **Attention Alert**:
  * If `waitingForRequesterTickets > 0`, an amber notice banner appears: "You have {N} ticket(s) waiting for your response." with a direct link.
* **Metric Cards Grid (4 Cards)**:
  1. **My Open Tickets**: Total unresolved tickets owned by authenticated requester.
  2. **In Progress**: Tickets currently being actively serviced.
  3. **Resolved**: Tickets resolved.
  4. **Closed**: Formally closed tickets.
  * Each card includes an explicit count and an accessible "View all" link routing to `My Tickets` filtered by that status.
* **Main Content Split (2:1 Ratio)**:
  * **Left Column - "My Recent Tickets"**:
    * Table displaying up to 5 recently updated tickets owned by user.
    * Columns: Ticket Number, Summary, Status badge, Last Updated.
    * Empty state: "You have not submitted any tickets yet." with a primary CTA button "Submit Your First Ticket".
  * **Right Column - "Quick Actions"**:
    * `Create Ticket`: Primary button directing to ticket submission.
    * `View My Tickets`: Navigates to full paginated ticket list.

### 4.3. Administrator Dashboard Screen (`AdminDashboard.tsx`)
* **Layout**: Reuses the IT Staff operational dashboard grid, and embeds an **Administrator System Overview Card**:
  * Displays: Total Users, Active Users, Inactive Users, and breakdown by Role (`Requester: N`, `IT Staff: N`, `Admin: N`).
  * Action: "Manage Users →" shortcut button linking directly to `/admin/users`.

### 4.4. Actions Taken Section on Ticket Detail (`ActionsTakenSection.tsx`)
*(Reference: SE Lab 4 Handout Section 8.3)*
* **Placement**: Located in the tabbed workspace on Ticket Detail alongside *Public Comments*, *Internal Notes*, and *Attachments*.
* **Tab Header**: "Actions Taken (N)" with dynamic count badge.
* **Action Toolbar**:
  * For IT Staff / Admin: "+ Add Action Taken" primary button on the right.
  * For Requester: "+ Add Action Taken" button is completely absent.
* **Actions Taken Table**:
  * Columns:
    1. **Action Date/Time**: Formatted local date and time (`MMM DD, YYYY hh:mm A`).
    2. **Description**: Clear description of work performed.
    3. **Result**: Observed outcome or diagnostic finding (or "-" if pending).
    4. **Performed By**: Auto-captured staff member name with IT Staff badge.
    5. **Assignee**: Assigned staff name (or "Unassigned") with user badge.
    6. **Status**: Action status pill (`COMPLETED`, `IN_PROGRESS`, `PENDING`, `CANCELLED`).
    7. **Follow-Up**:
       * If `followUpRequired = true && !followUpResolvedAt`: Amber pill `Follow-Up Needed`. Clicking or focusing expands an inline card showing `followUpNote`, with a "Mark Resolved" button for IT Staff.
       * If `followUpRequired = true && followUpResolvedAt`: Green pill `Follow-Up Resolved`.
       * If `followUpRequired = false`: Muted `None`.
    8. **Attachment Notes**: Text pointer to relevant attachments (e.g. `See log_output.txt`).
    9. **Actions (IT Staff/Admin only)**: "Edit" button, "Cancel" button.
  * **Empty State**: "No actions taken recorded yet for this ticket. Use the button above to record technical diagnostics or actions."
  * **Requester View**: Read-only presentation; edit, cancel, and add buttons are not rendered. Staff emails are excluded.

### 4.5. Create / Edit Action Taken Modal (`ActionTakenModal.tsx`)
* **Dialog Container**: Centered modal with backdrop, accessible keyboard focus trap, and focus return to triggering button upon close.
* **Form Controls**:
  1. **Action Date/Time**: Datetime-local picker, defaulting to current time.
  2. **Performed By (auto)**: Read-only display of current authenticated user name (`--color-input-bg-readonly`).
  3. **Assignee**: Select dropdown populated with active IT Staff and Administrators. Inactive accounts and Requesters are omitted.
  4. **Status**: Select dropdown with options `COMPLETED` (default), `IN_PROGRESS`, `PENDING`, `CANCELLED`.
  5. **Action Description**: Textarea (required, min 5 chars, max 2000 chars, placeholder: "Describe the specific technical action performed...").
  6. **Result**: Textarea (required if status is `COMPLETED`, min 3 chars, max 2000 chars).
  7. **Follow-Up Required?**: Switch toggle / checkbox (`Yes / No`).
  8. **Follow-Up Note**: Textarea (dynamically appears and required if *Follow-Up Required* is checked; min 5 chars).
  9. **Attachment Notes**: Text input (optional, max 1000 chars, placeholder: "e.g., Refer to error_screenshot.png in Attachments").
* **Footer Actions**:
  * "Save Action": Primary green button, displays spinner when submitting.
  * "Cancel": Neutral secondary button.
* **Error State**: Displays inline field validation messages and a top alert banner on server errors; preserves all user inputs upon failure.

### 4.6. Ticket Workflow & Resolution Gate Guidance (`ResolutionGateModal.tsx`)
* **Status Controls**: On IT Staff Ticket Detail, the status transition selector displays permitted next states according to the status matrix (`BR-08`).
* **Requester Advisory Resolution Indicator**: If the Requester marked `problemAppearsResolved = true`, a prominent green notice box appears at the top of Ticket Detail:
  > **Requester Feedback**: The requester indicated that the problem appears resolved. Please verify actions and formally resolve the ticket.
* **Resolution Gate Modal**:
  * The "Resolve Ticket" button remains enabled and clickable.
  * Clicking it opens `ResolutionGateModal.tsx` prompting for the required **Resolution Summary**.
  * The modal evaluates the Resolution Gate criteria (`BR-09`) against the ticket's current state and displays a dynamic checklist:
    * Passed item: `✓ [Requirement Satisfied]` in forest green.
    * Failed item: `✕ [Requirement Unmet]` in red/amber with specific action IDs (e.g. `Action #3 has pending follow-up that must be resolved`).
  * The "Confirm Resolution" submit button remains disabled with a tooltip until all criteria in the checklist are green.

### 4.7. Optimistic Concurrency Conflict Feedback
* If a concurrent edit collision occurs (HTTP 409 Conflict):
  * The UI presents a warning modal: "Workflow Update Conflict: Another staff member updated this ticket while you were working. Your entered notes and resolution summary have been preserved."
  * Provides "Reload Latest" and "Keep My Input" actions so user inputs are never lost.

---

## 5. Responsive Rules Matrix

| Viewport Tier | Screen Width | Responsive Behavior |
| :--- | :--- | :--- |
| **Desktop** | $\ge 992\text{px}$ | 5-card metric row; 2:1 column split for Recent Tickets vs Quick Actions; full multi-column Actions Taken table. Content centered with `max-width: 1140px`. |
| **Tablet** | $768\text{px} - 991\text{px}$ | 2 to 3 card metric grid; stacked Quick Actions below Recent Tickets; tables scroll horizontally inside container (`overflow-x: auto`) with sticky columns; zero window horizontal scrolling. |
| **Mobile** | $< 768\text{px}$ | 1-column vertically stacked metric cards; Actions Taken presented as individual summary cards; form inputs stack vertically; touch targets $\ge 44\times 44\text{px}$; zero horizontal page overflow. |

---

## 6. Accessibility & Polish Standards

* **Keyboard Navigation**:
  * All metric cards, buttons, links, and form controls possess visible focus rings (`box-shadow: 0 0 0 3px rgba(0, 107, 60, 0.25)`).
  * Modals trap keyboard focus inside the dialog and return focus to the trigger button upon dismissal.
* **Screen Reader Accessibility (ARIA)**:
  * Metric cards include `aria-label` summarizing label, value, and action.
  * Alerts and Resolution Gate checklists utilize `aria-live="polite"`.
  * Expandable follow-up notes use `aria-expanded` and `aria-controls`.
* **Color Blindness**: All badges combine distinctive color fills with explicit text labels and icon cues.
* **Double-Click Prevention**: Primary buttons enter a busy state (`pointer-events: none`, opacity `0.75`, spinner icon) while API requests are pending.

---

## 7. Screenshot Visual Evidence Mapping

Screenshots for final grading submission will be placed in `artifacts/lab-04/screenshots/`:
1. `artifacts/lab-04/screenshots/staff-dashboard/`:
   * `staff-dashboard-desktop.png`: 5-card metric row, Recent Tickets, Quick Actions.
   * `staff-dashboard-tablet.png`: 2-column tablet layout.
   * `staff-dashboard-mobile.png`: Stacked mobile cards.
   * `staff-dashboard-empty.png`: Zero counts / empty queue state.
2. `artifacts/lab-04/screenshots/requester-dashboard/`:
   * `requester-dashboard-desktop.png`: 4 metric cards, Recent Tickets table, Create Ticket CTA.
   * `requester-dashboard-mobile.png`: Stacked mobile view.
3. `artifacts/lab-04/screenshots/actions-taken/`:
   * `actions-taken-list.png`: Full table with performer, assignee, badges, follow-up flags.
   * `action-taken-create-modal.png`: Create modal with active assignee select and follow-up inputs.
   * `action-taken-edit-modal.png`: Edit modal changing action status.
   * `resolution-gate-blocked.png`: Resolution Gate blocking alert modal with checklist.
   * `requester-actions-view.png`: Requester read-only view.

---

## 8. Removal of Temporary, Duplicate & Obsolete UI Elements (§7 & §8.5)

To guarantee a clean, professional production appearance as required by §7 and §8.5 of the Handout, the following checklist items are verified and enforced:

| Item ID | Category | Specific Element / Behavior | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **CLEAN-01** | Dev Controls | Dev Requester Context Switcher / Toolbar | Any temporary dev user switchers from Labs 1–2 are removed from production screens; role switching is strictly handled via real login/logout session flow. |
| **CLEAN-02** | Redundant Elements | Duplicate Ticket Status Displays | Ensure Ticket Detail renders only one canonical Status Badge in the header; remove duplicate status cards or redundant action logs. |
| **CLEAN-03** | Placeholder Content | Placeholder texts & "Lorem Ipsum" | All placeholder strings, mock JSON blobs, and fake sample labels are eliminated in favor of real database-driven entity fields. |
| **CLEAN-04** | Dead Controls | Unfinished buttons & dead links | All controls with `href="#"`, `href="javascript:void(0)"`, or non-functional `onClick` stubs are removed or linked to active routes. |
| **CLEAN-05** | Form Clutter | Unused input fields | Form inputs not defined in the Sprint 4 contract are pruned to avoid confusing users. |
| **CLEAN-06** | Navigation Consistency | AppHeader navigation tabs | Canonical tabs match the authenticated user's exact role (no extraneous tabs or broken paths). |
| **CLEAN-07** | Console Hygiene | Uncaught console errors / warnings | Zero uncaught runtime errors, unhandled promise rejections, or React duplicate-key warnings during page transitions. |
