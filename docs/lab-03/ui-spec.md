# Lab 3 UI Specification: Zen Green System & Role-Based Workflows

## 1. Visual Theme & Design Tokens

TokTickIT reuses and extends the **Zen Green Design System** established in Lab 2. All screens must look like parts of a cohesive, professional enterprise IT service portal.

### 1.1. Color Tokens
| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | App header background, primary action buttons, active focus accents. |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, subheadings, hover states, secondary actions. |
| `--color-pale-green` | `#EAF6EF` | Selected rows, success tints, subtle section card backdrops. |
| `--color-page-bg` | `#F5F7F6` | Quiet off-white backdrop across all views. |
| `--color-surface-card` | `#FFFFFF` | Card containers, modal sheets, table containers. |
| `--color-text-main` | `#1C2A22` | High-contrast dark charcoal-green typography. |
| `--color-text-muted` | `#5C6F64` | Subtitles, timestamp metadata, placeholder hints. |
| `--color-border-neutral` | `#D8E2DC` | Default input and card borders. |
| `--color-input-bg-editable` | `#FFFFFF` | Background for editable inputs. |
| `--color-input-bg-readonly` | `#EFEFEA` | Distinct ivory/gray-green background for read-only fields. |
| `--color-internal-note-bg` | `#FFFDF0` | Soft warm amber-ivory background for private Internal Notes card. |
| `--color-internal-note-border` | `#ECC94B` | Distinct border accent identifying restricted Internal Notes. |
| `--color-error` | `#C53030` | Red validation errors, danger badges, destructive buttons. |
| `--color-error-bg` | `#FFF5F5` | Background tint for error callouts. |
| `--color-warning` | `#DD6B20` | Amber indicators, pending alerts. |
| `--color-success` | `#22543D` | Positive status badges, confirmation notices. |

### 1.2. Role Badge Styling
* **Requester**: Pale green pill background (`#EAF6EF`), dark green border and text (`#006B3C`).
* **IT Staff**: Primary green pill background (`#006B3C`), crisp white text (`#FFFFFF`).
* **Administrator**: Charcoal/slate pill background (`#2D3748`), warm gold/amber border (`#D69E2E`), white text (`#FFFFFF`).

### 1.3. Ticket Status & Priority Badges
* **Status Badges**:
  * `NEW`: Blue badge (`bg: #EBF8FF, text: #2B6CB0`)
  * `OPEN`: Cyan badge (`bg: #E6FFFA, text: #234E52`)
  * `IN_PROGRESS`: Amber badge (`bg: #FEEBC8, text: #7B341E`)
  * `WAITING_FOR_REQUESTER`: Purple badge (`bg: #FAF5FF, text: #553C9A`)
  * `RESOLVED`: Green badge (`bg: #C6F6D5, text: #22543D`)
  * `CLOSED`: Gray badge (`bg: #EDF2F7, text: #4A5568`)
  * `REOPENED`: Orange badge (`bg: #FFEDD5, text: #9A3412`)
  * `CANCELLED`: Red badge (`bg: #FED7D7, text: #9B2C2C`)
* **Priority Badges**:
  * `LOW`: Soft gray-green (`#EDF2F7`)
  * `MEDIUM`: Soft yellow/green (`#FEFCBF`)
  * `HIGH`: Orange (`#FEEBC8`)
  * `URGENT`: Bright crimson (`#FED7D7`)

---

## 2. Application Shell & Navigation

* **Unauthenticated State**: Shows brand logo only; main navigation is hidden.
* **Authenticated Header**:
  * Left: TokTickIT brand logo with icon.
  * Middle Navigation Tabs:
    * **Requester**: *My Tickets*, *Create Ticket*.
    * **IT Staff**: *Ticket Queue*, *Create Ticket*.
    * **Administrator**: *User Management*.
  * Right:
    * Current User display: Full Name and Role Badge.
    * **Logout** button: Outlined button with sign-out icon. Clicking immediately ends session and redirects to Login.

---

## 3. Screen Specifications

### 3.1. Login Screen
* **Layout**: Centered card (`max-width: 440px`) on `--color-page-bg`.
* **Controls**:
  * Header: TokTickIT logo, title "Sign in to your account".
  * Email input (`type="email"`, required, auto-focus).
  * Password input (`type="password"`, required, with visibility toggle icon).
  * Primary "Sign In" button with busy spinner state.
  * Failure Alert: Red callout directly above submit button for invalid credentials or inactive accounts.

### 3.2. Mandatory First-Login Password Change Screen
* **Trigger**: Activated immediately when a logged-in user has `mustChangePassword = true`. All other routes are locked.
* **Layout**: Centered card (`max-width: 480px`).
* **Controls**:
  * Title: "Change Your Password".
  * Subtitle: "You must choose a new password before entering the application."
  * Current (Temporary) Password input.
  * New Password input.
  * Confirm New Password input.
  * Real-time validation checklist (minimum 8 chars, uppercase, lowercase, number/special character, passwords match).
  * "Continue" primary button (disabled until checklist is 100% satisfied).

### 3.3. Requester Continuation Screens
* **Create Ticket & My Tickets**: Retains full Lab 2 behavior and Zen Green layout, sourcing identity from authenticated session.
* **Requester Ticket Detail**:
  * Read-only header with Category, Related System, Status, and Priority.
  * Attachments card (view, download, soft-remove).
  * **"Problem Appears Resolved"** action button: Prominently displayed if status is not `RESOLVED`/`CLOSED`. Confirms action and appends audit record.
  * **Public Comments Thread**: Lists all public messages from IT Staff and Requester. Includes an "Add Comment" textarea with busy spinner.
  * **Internal Notes**: Completely omitted from the Requester interface.

### 3.4. IT Staff Ticket Queue Screen
* **Layout**: Full-width container with responsive table and filter toolbar.
* **Filter Toolbar**:
  * Search bar (matches Summary and Ticket Number).
  * Category dropdown filter.
  * Status dropdown filter.
  * IT Priority dropdown filter.
  * Ownership filter (*All Tickets*, *Assigned to Me*, *Unassigned*).
  * Clear Filters button.
* **Queue Data Table**:
  * Columns: Ticket Number, Created, Summary, Category, Priority, IT Priority, Status, Ticket Owner, Action.
  * Empty State: "No tickets in queue".
  * No-Results State: "No tickets match your filter criteria" with "Reset Filters" action.
  * Pagination footer: Showing items range, page numbers, Previous/Next buttons.
  (*table ui should be similar to table of My Ticket with different component*)

### 3.5. IT Staff Ticket Detail Screen
* **Dual-Column Operational Layout**:
  * **Left Column / Ticket Details**:
    * System fields: Ticket Number, Created, Requester Name, Category, Related System.
    * Editable Controls:
      * **Ticket Owner**: Dropdown of active IT Staff with "Claim" quick-action button.
      * **IT Priority**: Dropdown selector (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
      * **Current Status**: Workflow transition dropdown showing only permitted next states with confirmation.
    * Summary and Description text blocks.
    * Attachments panel.
  * **Right Column / Communications**:
    * **Public Comments Panel** (White card, green accent border): Visible to Requester and Staff.
    * **Internal Notes Panel** (Soft amber card `#FFFDF0`, amber border `#ECC94B`): Clearly marked with lock icon and warning tag: *"Internal Notes (Visible only to IT Staff & Admin)"* to prevent accidental leaks.

### 3.6. Administrator User Management Screen
* **Layout**: Responsive table with top search and action bar.
* **Action Bar**:
  * Search input (searches Name and Email).
  * Role filter dropdown (*All Roles*, *Requester*, *IT Staff*, *Administrator*).
  * **"+ Create User"** primary action button.
* **User Data Table**:
  * Columns: Full Name, Email Address, Role (with role badge), Status (`Active` green badge / `Inactive` gray badge), and Actions (`Edit`).
* **Modal Dialogs**:
  * **Create User Modal**: Name, Email, Role selector, Active toggle, Initial Password field.
  * **Edit User Modal**: Name, Email, Role selector, Active toggle. Includes safeguards preventing Admin self-deactivation or deactivation of the last active Admin.
  * **Reset Password Modal**: Displays user name and provides new initial password input with forced reset confirmation.

---

## 4. Responsive & Accessibility Rules

| Viewport Tier | Screen Width | Responsive Behavior |
| :--- | :--- | :--- |
| **Desktop** | $\ge 992\text{px}$ | Multi-column grid layouts; two-column Ticket Detail; complete table presentation. |
| **Tablet** | $768\text{px} - 991\text{px}$ | Tables horizontally scrollable with sticky action columns; detail cards stack into single column. |
| **Mobile** | $< 768\text{px}$ | Tables transform into mobile card layouts; form controls stack vertically; header menu collapses into drawer. |

* **Keyboard Focus**: Focus visible rings (`2px solid #006B3C`) on all interactive buttons, inputs, and modals.
* **Color Blindness**: All status and priority badges combine distinctive color fills with explicit text labels and icon shapes.

---

## 5. Standard Page URLs

> **Dev server**: `http://localhost:5173` (Vite, client) · `http://localhost:3000` (Express, API). All client routes are path-based (React Router or equivalent).

| Page / Screen | URL | Accessible By |
| :--- | :--- | :--- |
| **Login** | `http://localhost:5173/login` | Public (unauthenticated) |
| **Mandatory Password Change** | `http://localhost:5173/change-password` | Any authenticated user with `mustChangePassword = true` |
| **My Tickets List** | `http://localhost:5173/my-tickets` | Requester |
| **Create Ticket** | `http://localhost:5173/create-ticket` | Requester, IT Staff, Administrator |
| **Requester Ticket Detail** | `http://localhost:5173/tickets/:id` | Requester (own tickets only) |
| **IT Staff Ticket Queue** | `http://localhost:5173/staff/queue` | IT Staff, Administrator |
| **IT Staff Ticket Detail** | `http://localhost:5173/staff/tickets/:id` | IT Staff, Administrator |
| **Administrator User Management** | `http://localhost:5173/admin/users` | Administrator |

> **Route Guard Rules**:
> - Unauthenticated users accessing any protected route are redirected to `/login`.
> - Authenticated users with `mustChangePassword = true` are redirected to `/change-password` regardless of destination.
> - Role mismatches (e.g. Requester accessing `/staff/queue`) return HTTP 403 from the API and redirect to the user's default landing page on the client.
