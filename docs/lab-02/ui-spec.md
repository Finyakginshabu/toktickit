# Lab 2 UI Specification: Zen Green Design System

## 1. Visual Theme & Design Tokens

The TokTickIT user interface is built on the **Zen Green Theme**, designed to project a calm, professional, and accessible IT service desk aesthetic.

### 1.1. Color Tokens
| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | App header background, primary action buttons, active focus rings, strong visual emphasis. |
| `--color-secondary-green` | `#0B7A46` | Active tab indicators, secondary highlights, links, button hover states. |
| `--color-pale-green` | `#EAF6EF` | Selected item background, subtle container fills, success container tints. |
| `--color-page-bg` | `#F5F7F6` | Main viewport background, quiet off-white/near-white backdrop. |
| `--color-surface-card` | `#FFFFFF` | Card containers, modal surfaces, form wrappers. |
| `--color-text-main` | `#1C2A22` | Primary typography; dark charcoal-green for high contrast and reduced eye strain. |
| `--color-text-muted` | `#5C6F64` | Subtitles, helper text, timestamps, placeholder text. |
| `--color-border-neutral` | `#D8E2DC` | Card borders, input field outlines, divider lines. |
| `--color-input-bg-editable` | `#FFFFFF` | Background for interactive, editable form controls. |
| `--color-input-bg-readonly` | `#EFEFEA` | Soft warm-ivory / gray-green background for read-only fields. |
| `--color-error` | `#C53030` | Validation error text, invalid border outlines, destructive warning banners. |
| `--color-error-bg` | `#FFF5F5` | Background tint for error callouts. |
| `--color-warning` | `#DD6B20` | Amber badge indicators, attention callouts. |
| `--color-warning-bg` | `#FFFAF0` | Background tint for warning callouts. |
| `--color-success` | `#22543D` | Success confirmation text, positive status badges. |
| `--color-success-bg` | `#F0FFF4` | Background tint for success banners. |

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
* **Prohibition on Emojis**: Raw system emojis (e.g. 📋, ➕, 👤, ℹ) are strictly prohibited across all screens to prevent cross-browser rendering inconsistencies and inaccessible contrasts.
* **Standard Semantic Icons**:
  * Navigation Tabs: `assignment` (My Tickets), `add_circle` (Create Ticket)
  * Identity & Roles: `account_circle`, `person`
  * Alerts & Banners: `info`, `warning`, `check_circle`, `error`
  * Actions & Controls: `arrow_forward`, `search`, `close`, `delete`, `download`, `upload_file`

---

## 2. Component Design & State Rules

### 2.1. Form Controls & Field States
* **Label Placement**: Labels are always positioned immediately above input controls with `font-weight: 500` and `margin-bottom: 6px`.
* **Required Field Marker**: A red asterisk (`*`, color `#C53030`) follows the label text. The asterisk does not replace clear validation messages.
* **Control Height**: All single-line controls (`<input type="text">`, `<select>`, `<input type="file">`) share a standard height of `42px`.
* **Multiline Description**: `<textarea>` has a minimum height of `120px` and allows vertical resizing only without breaking parent containers.
* **Field State Matrix**:
  * **Default / Idle**: White background, `1px solid #D8E2DC`, rounded corners `6px`.
  * **Focus**: `1px solid #006B3C` with an outline/box-shadow `0 0 0 3px rgba(0, 107, 60, 0.2)`.
  * **Invalid / Error**: `1px solid #C53030`, with a validation message rendered directly below the control in `#C53030` (`font-size: 13px`).
  * **Read-Only**: Background `#EFEFEA`, border `1px solid #D8E2DC`, text color `#2D3748`, cursor `default`.
  * **Disabled**: Background `#E2E8F0`, border `1px solid #CBD5E0`, text color `#A0AEC0`, cursor `not-allowed`.

### 2.2. Button Hierarchy & States
1. **Primary Action** (`.btn-zen-primary`):
   * Background: `#006B3C`, Text: `#FFFFFF`, Border: `none`, Padding: `8px 20px`, Border-Radius: `6px`.
   * Hover: `#0B7A46`.
   * Active: `#00502D`.
   * Busy/Loading: Displays inline SVG spinner, text changes (e.g., "Submitting..."), `pointer-events: none`, opacity `0.75`.
2. **Secondary Action** (`.btn-zen-secondary`):
   * Background: `#FFFFFF`, Text: `#006B3C`, Border: `1px solid #006B3C`.
   * Hover: Background `#EAF6EF`.
3. **Destructive Action** (`.btn-zen-destructive`):
   * Background: `#FFFFFF`, Text: `#C53030`, Border: `1px solid #C53030`.
   * Hover: Background `#FFF5F5`.
4. **Disabled Action**:
   * Background: `#E2E8F0`, Text: `#A0AEC0`, Border: `1px solid #CBD5E0`, cursor `not-allowed`.

### 2.3. Status & Priority Badges
Badges use pill styling (`border-radius: 9999px`, `padding: 4px 10px`, `font-size: 12px`, `font-weight: 600`):
* **Status Badges**:
  * `NEW`: Pale Green fill (`#EAF6EF`), Dark Green text (`#006B3C`), Border `1px solid #B8E2C8`.
  * `IN_PROGRESS`: Soft Blue fill (`#EBF8FF`), Blue text (`#2B6CB0`), Border `1px solid #BEE3F8`.
  * `PENDING`: Soft Yellow fill (`#FEFCBF`), Brown text (`#975A16`), Border `1px solid #FAF089`.
  * `RESOLVED` / `CLOSED`: Neutral Gray fill (`#EDF2F7`), Dark Gray text (`#4A5568`), Border `1px solid #E2E8F0`.
* **Priority Badges**:
  * `LOW`: Slate Gray fill (`#EDF2F7`), text `#4A5568`.
  * `MEDIUM`: Soft Green/Teal fill (`#E6FFFA`), text `#234E52`.
  * `HIGH`: Amber fill (`#FEEBC8`), text `#7B341E`.
  * `URGENT`: Crimson fill (`#FED7D7`), text `#9B2C2C`.

---

## 3. Screen Layouts & Workflows

### 3.1. Application Shell & Navigation
* **Top Bar**: Solid `#006B3C` background with white branding (`TokTickIT IT Service Desk`).
* **Navigation Links**: "My Tickets" and "Create Ticket" tabs with active indicators (`border-bottom: 3px solid #FFFFFF` or light highlight).
* **Identity Context Widget**: Displays Requester Name, Department badge, and a "Change Requester" button on the right.

### 3.2. Development Requester Selector Modal / Screen
* **Layout**: Centered card (`max-width: 540px`) on `--color-page-bg`.
* **Informational Notice**: Amber/blue styled callout box stating:
  > *Lab 2 Development Mode: Select a Development Requester to simulate ticket ownership. Authentication and role-based access will be introduced in Lab 3.*
* **Controls**: Active Requester dropdown (`<select>`), Cancel button (if changing), and "Continue to TokTickIT" Primary button.
* **States**: Loading spinner while fetching requesters, safe error alert if backend is offline.

### 3.3. Create Ticket Screen Layout
* **Header**: "Create IT Support Ticket" with descriptive subtitle.
* **Form Grid (Desktop)**:
  * Top Row: Category dropdown (50% width) + Related System dropdown (50% width).
  * Second Row: Requested Priority radio/dropdown (50% width) + System Status notice (50% width).
  * Third Row: Ticket Summary input (100% width, counter: "0 / 100").
  * Fourth Row: Detailed Description textarea (100% width, counter: "0 / 2000").
  * Fifth Row: Attachment Dropzone / File Picker (supports drag-and-drop, lists selected files with remove buttons, highlights errors for files >5MB or invalid types).
  * Action Bar: "Cancel" Secondary button and "Submit Ticket" Primary button.

### 3.4. My Tickets Screen Layout
* **Toolbar**:
  * Search input with search icon (searches Ticket Number and Summary).
  * Dropdown filters: Category (`All Categories`, `Hardware`, ...), Requested Priority, and Status.
  * "Clear Filters" link/button.
  * "+ Create Ticket" shortcut button.
* **Table (Desktop ≥ 992px)**:
  * Columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `IT Priority`, `Current Status`, `Actions`.
  * Hover rows with subtle `#F5F7F6` tint; row click navigates to Ticket Detail.
* **Card List (Mobile < 768px)**:
  * Stacked cards displaying Ticket Number header with status pill, summary, category/system tag, and relative timestamp.
* **Pagination Footer**: "Showing X to Y of Z tickets", Previous / Page Numbers / Next buttons.
* **Empty States**:
  * Zero tickets created: "No tickets submitted yet. Click 'Create Ticket' to request support."
  * Filter zero results: "No tickets match your filter criteria. [Clear Filters]".

### 3.5. Requester Ticket Detail Screen Layout
* **Back Link**: "← Back to My Tickets" breadcrumb link.
* **Ticket Overview Card**:
  * Two-column grid with labeled read-only fields (Ticket Number, Requester, Category, Related System, Requested Priority, IT Priority, Status, Created Date, Last Updated).
  * Full-width Summary and Description containers with soft read-only styling.
* **Attachments Card**:
  * Attachment counter badge ("Attachments (X/5)").
  * Upload control (active when X < 5; disabled with warning when X == 5).
  * Attachment items showing file icon (PDF / Image), original file name, formatted size (e.g. `1.2 MB`), upload date, "Download" button, and "Remove" button.
  * **Soft-Removed Attachment Items**: Visually dimmed row, "Removed" red tag, display of removal reason and date, download button disabled with tooltip.

---

## 4. Responsive Rules Matrix

| Viewport | Breakpoint | Layout Adaptations |
| :--- | :--- | :--- |
| **Desktop** | `≥ 992px` | Content centered in container (`max-width: 1140px`). Multi-column form layouts and full data tables. |
| **Tablet** | `768px - 991px` | Container padded `16px`. Two-column forms reduce margins; data table enables horizontal touch scroll with sticky action columns. |
| **Mobile** | `< 768px` | Container full width with `12px` gutters. Form fields stack in a single column (`100% width`). Table transforms into stacked ticket cards. Touch targets minimum `44px × 44px`. |

---

## 5. Visual Inspection & Screenshot Checklist

Screenshots will be captured and placed into `artifacts/lab-02/screenshots/`:
- `artifacts/lab-02/screenshots/create-ticket/`
  - `01-create-ticket-initial-desktop.png` (Desktop form with loaded dropdowns)
  - `02-create-ticket-validation-errors.png` (Inline red error messages on empty/invalid submit)
  - `03-create-ticket-invalid-attachment.png` (Error message on >5MB or non-allowed file)
  - `04-create-ticket-submitting-state.png` (Submit button disabled with busy spinner)
  - `05-create-ticket-success-confirmation.png` (Generated official ticket number displayed)
  - `06-create-ticket-api-failure-preserved.png` (Backend offline banner with form inputs intact)
- `artifacts/lab-02/screenshots/my-tickets/`
  - `01-my-tickets-requester-a-desktop.png` (Requester A ticket list)
  - `02-my-tickets-requester-b-isolation.png` (Requester B ticket list showing isolation)
  - `03-my-tickets-search-filter.png` (Keyword search and priority filter active)
  - `04-my-tickets-pagination.png` (Multi-page navigation controls)
  - `05-my-tickets-empty-state.png` (0 tickets initial empty state)
  - `06-my-tickets-no-results-state.png` (Filter mismatch state with clear filters action)
  - `07-my-tickets-mobile-card-view.png` (Mobile viewport ticket card representation)
- `artifacts/lab-02/screenshots/ticket-detail/`
  - `01-ticket-detail-readonly-desktop.png` (Read-only ticket header and details)
  - `02-ticket-detail-add-attachment.png` (Adding 2nd attachment to existing ticket)
  - `03-ticket-detail-soft-remove-dialog.png` (Soft-removal confirmation modal with reason input)
  - `04-ticket-detail-removed-attachment-blocked.png` (Removed attachment badge with download blocked)
  - `05-ticket-detail-cross-requester-rejected.png` (Access Denied / 403 error on unauthorized access)
