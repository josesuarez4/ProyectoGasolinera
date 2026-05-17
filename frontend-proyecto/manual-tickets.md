# Manual — Tickets

## Staff Ticket Management (`/staff/tickets`)

### Purpose

The staff ticket management page allows administrators and employees to view, filter, and edit all fiscal tickets issued at the POS, both from clients and from suppliers. It also provides a detailed view of each ticket and its line items.

### Visibility and routing

- Route: `/staff/tickets`
- Only authenticated staff users (`ADMIN`, `MANAGER`, `EMPLOYEE`) can access it.
- Unauthenticated users and `CLIENT` users are redirected away by the route guard.
- The page is rendered inside the staff shell layout.

### UI components used

- `p-tabs` / `p-tablist` / `p-tabpanel` from PrimeNG for the Client / Supplier tab split.
- `app-table` (shared component) for the paginated, sortable ticket tables.
- `app-generic-form` (shared component) for the edit dialog.
- `app-detail-view` (shared component) for the ticket detail dialog.
- `p-dialog` from PrimeNG for the detail overlay.
- Native `<input>`, `<select>`, and `<button>` elements inside the filter bar.
- `p-message` (inline markup) for success and error banners.

### Tabs

| Tab | Content |
|-----|---------|
| Client | All tickets whose `type` is not `SUPPLIER`. |
| Supplier | All tickets whose `type` is `SUPPLIER`. |

Both tabs share the same filter bar and the same set of row actions.

### Filter bar

| Filter | Field | Behaviour |
|--------|-------|-----------|
| Code | Text input | Case-insensitive substring match on `ticket.code`. |
| Payment | Select | Exact match on `paymentType` (`CASH`, `CARD`, `TRANSFER`). Empty value clears the filter. |
| Origin | Select | Matches `isOnline` boolean (`true` = Online, `false` = In-person). Empty value clears the filter. |
| Date | Date input | Exact match on the date portion (`yyyy-MM-dd`) of `ticket.date`. |
| Sort by date | Toggle button | Cycles between **Newest first** (`desc`) and **Oldest first** (`asc`). Default is `desc`. |
| Clear filters | Button | Resets all four filters. Disabled when no filter is active. |

All filters are applied client-side through the `applyFilters()` computed signal after the tickets are loaded from the API.

### Table columns — Client tab

| Column | Field | Notes |
|--------|-------|-------|
| Code | `code` | Unique ticket identifier. |
| Date | `date` | Formatted as `dd/MM/yyyy HH:mm`. |
| Register ID | `cashRegisterId` | POS register that issued the ticket. |
| Employee | `employeeName` | Employee who processed the ticket. |
| Client | `clientName` | Shows `—` when null. |
| Type | `type` | Ticket type value. |
| Payment | `paymentType` | Payment method. |
| Origin | `isOnline` | Shows `Online` or `In-person`. |
| Total | `totalPrice` | Right-aligned, formatted as EUR currency. |

### Table columns — Supplier tab

| Column | Field | Notes |
|--------|-------|-------|
| Code | `code` | Unique ticket identifier. |
| Date | `date` | Formatted as `dd/MM/yyyy HH:mm`. |
| Register ID | `cashRegisterId` | POS register that issued the ticket. |
| Employee | `employeeName` | Employee who processed the ticket. |
| Payment | `paymentType` | Payment method. |
| Total | `totalPrice` | Right-aligned, formatted as EUR currency. |

### Row actions

| Action | Icon | Behaviour |
|--------|------|-----------|
| Edit | `pi-pencil` (outlined, info severity) | Opens the edit dialog for the selected ticket. |

Clicking anywhere on a row (outside the action button) opens the ticket detail dialog.

### Edit dialog

- Title: `Edit Ticket — <code>`.
- Save button label: `Update`.
- The form fields shown depend on the ticket type:

| Field | Type | Condition |
|-------|------|-----------|
| Payment | Select (`CASH` / `CARD`) | Always shown. Spans full width for supplier tickets, half width for client tickets. |
| Client Name | Text input | Shown only for non-supplier tickets. |
| Total Price (€) | Currency input | Shown only for supplier tickets. |

- On save, if `clientName` was changed and a matching client is found in the user list, `clientId` is resolved automatically.
- On save, clearing `clientName` also sets `clientId` to `null`.

### Detail dialog

Opens when a row is clicked. Shows:

**Sidebar:**
- Date (formatted `dd/MM/yyyy HH:mm`).
- Payment method.
- Origin (Online Store / Physical POS).
- Client name (only when present).
- Total amount (large, gradient-styled text).

**Main area:**
- Table of line items with columns: Item, Quantity, Unit Price, Subtotal.
- Footer line showing the employee name and register number (only when present).

### What happens when the user interacts

- Typing in the code filter immediately narrows both tables.
- Changing the payment, origin, or date filter immediately narrows both tables.
- Clicking **Sort by date** toggles the sort direction without reloading data.
- Clicking **Clear filters** resets all filter controls at once.
- Clicking the edit icon fetches ticket details from the API and opens the edit form.
- Submitting the edit form calls `PATCH /tickets/:id`, shows a toast on success, and reloads the ticket list.
- Clicking a row fetches ticket details from the API and opens the read-only detail dialog.
- Closing either dialog resets the corresponding signal to `null`.

### Data and API endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Load all tickets | `GET` | `http://localhost:8080/tickets` (via `TicketService.getAllTickets()`) |
| Load ticket details | `GET` | `http://localhost:8080/tickets/:id/details` (via `TicketService.getTicketDetails()`) |
| Update ticket | `PATCH` / `PUT` | `http://localhost:8080/tickets/:id` (via `TicketService.updateTicket()`) |
| Load client list | `GET` | `http://localhost:8080/users` (via `UserService.getUsers()`, filtered to `role === 'CLIENT'`) |

The ticket list is split client-side: tickets with `type !== 'SUPPLIER'` go into the Client tab signal; tickets with `type === 'SUPPLIER'` go into the Supplier tab signal.

### Validation rules

- The edit form does not define explicit validators in the component; validation is delegated to `app-generic-form`.
- Backend validation errors (HTTP 400 with an `errors` map) are surfaced field-by-field in the error banner.

### States and edge cases

- **Loading state** — the `loading` signal is `true` while the ticket list request is in flight. The table renders a loading indicator.
- **Empty result** — the table shows `No tickets match the current filters.` (Client) or `No supplier tickets match the current filters.` (Supplier).
- **Load error** — the error banner shows `Could not load tickets.` and both ticket arrays are set to empty.
- **Saving state** — the status banner briefly shows `Saving…` while the update request is in flight.
- **Save success** — a PrimeNG toast notification is displayed and the list is refreshed.
- **Save error (400)** — field-level errors from the API are concatenated and shown in the error banner.
- **Save error (other)** — a generic error message is shown in the error banner.
- **Detail fetch error** — the detail dialog opens but with an empty items array.
- **No active filters** — the Clear filters button is disabled.
- **Dark mode** — the component applies `:host-context(html.my-app-dark)` overrides for all filter, header, and table elements.

### Implementation notes

- The component uses `ChangeDetectionStrategy.OnPush` with Angular signals throughout.
- `takeUntilDestroyed(this.destroyRef)` is used on all subscriptions to avoid memory leaks.
- `filteredAllTickets` and `filteredSupplierTickets` are both `computed` signals that call `applyFilters()` on their respective source arrays.
- `ticketFormConfig` is also a `computed` signal so the form layout reacts to the current `ticketToEdit` type.
- The `datePipe` and `currencyPipe` instances are created directly in the component (not injected) because column formatter functions need them synchronously.

---

## My Invoices (`/my-invoices`)

### Purpose

The My Invoices page lets authenticated client users browse their own purchase history, filter it, and inspect the line items of any individual invoice.

### Visibility and routing

- Route: `/my-invoices` (or equivalent client route).
- Only authenticated `CLIENT` users can access it.
- Staff users are redirected to `/staff` by the route guard.
- Unauthenticated users are redirected to `/login`.
- The page is rendered inside the global app shell (header, footer, cart drawer, and toast come from the root layout).

### UI components used

- `app-table` (shared component) for the paginated invoice list.
- `app-detail-view` (shared component) for the invoice detail overlay.
- `p-dialog` from PrimeNG for the detail overlay.
- `p-select` from PrimeNG for the payment and origin filter dropdowns.
- `pInputText` from PrimeNG for the code search field.
- `p-button` from PrimeNG for the Clear filter action.
- `ngModel` two-way binding for the search input and dropdowns.

### Filter bar

| Filter | Component | Behaviour |
|--------|-----------|-----------|
| Search by code | Text input with search icon | Case-insensitive substring match on `ticket.code`. Uses `[(ngModel)]` binding. |
| Payment | `p-select` | Exact match on `paymentType` (`CASH`, `CARD`). `null` value means no filter. |
| Origin | `p-select` | Matches `isOnline` boolean (`true` = Online, `false` = In-person). `null` means no filter. |
| Clear | `p-button` (text, secondary) | Resets all three filters to their empty/null defaults. |

All filtering is done client-side through the `filteredTickets` getter after all invoices are loaded on `ngOnInit`.

### Table columns

| Column | Field | Notes |
|--------|-------|-------|
| Code | `code` | Unique ticket identifier. |
| Date | `date` | Formatted as `dd/MM/yyyy HH:mm`. |
| Type | `type` | Ticket type value. |
| Payment | `paymentType` | Payment method. |
| Origin | `isOnline` | Shows `Online` or `In-person`. |
| Total | `totalPrice` | Right-aligned, formatted as EUR currency. |

Rows are clickable. There are no action buttons — the only interaction is clicking a row to open the detail view.

### Detail dialog

Opens when a row is clicked. Shows:

**Sidebar:**
- Date (formatted `dd/MM/yyyy HH:mm`).
- Total amount (highlighted value).

**Main area:**
- Table of line items with columns: Product, Quantity, Unit Price, Subtotal.
- Empty state message `No products in this invoice.` when the details array is empty.

The dialog title is `Invoice #<code>` and the subtitle is `Ticket details`. The status badge displays the `paymentType` with `info` severity.

### What happens when the user interacts

- Typing in the code search immediately narrows the table (via getter recomputation on change detection).
- Selecting a payment or origin option immediately narrows the table.
- Clicking **Clear** resets all three filter values.
- Clicking a row calls `TicketService.getTicketDetails(ticket.id)` and opens the detail dialog with the fetched line items.
- If the detail fetch fails, the dialog still opens but with an empty items array.
- Closing the dialog (via the back button or overlay click) sets `selectedInvoice` to `null`.

### Data and API endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Load client invoices | `GET` | `http://localhost:8080/tickets/client/:userId` (via `TicketService.getClientTickets(userId)`) |
| Load invoice details | `GET` | `http://localhost:8080/tickets/:id/details` (via `TicketService.getTicketDetails(id)`) |

The `userId` is obtained from `AuthService.currentUser()` on `ngOnInit`. If no user is found, the tickets array is set to empty and no request is made.

### Validation rules

- There are no forms on this page. There is no field-level validation.
- The only conditional rendering rule is authentication state (handled by the route guard before the component loads).

### States and edge cases

- **Loading state** — there is no explicit loading indicator; the table renders as empty until the subscription resolves.
- **Empty invoice list** — the table shows `No invoices found.`
- **Load error** — the tickets array is set to empty; no error banner is displayed to the user.
- **Detail fetch error** — the dialog opens with an empty items array rather than showing an error.
- **No user session** — if `currentUser()` returns null or has no `id`, the component sets an empty array and skips the API call.
- **Dark mode** — the component applies `:host-context(.my-app-dark)` overrides for the header, filter bar, search input, and dropdowns.
- **Responsive layout** — the filter bar wraps on narrow screens thanks to `flex-wrap: wrap`. The table scrolls horizontally if needed.

### Implementation notes

- The component uses `ChangeDetectionStrategy.OnPush` with Angular signals for `tickets`, `selectedInvoice`, `filterPayment`, and `filterOnline`.
- `searchCode` is a plain class property bound with `[(ngModel)]`; changes to it trigger `filteredTickets` recomputation through Angular's change detection cycle (not a signal).
- `filteredTickets` is a getter (not a computed signal), so it is recalculated on every change-detection cycle when any of its dependencies change.
- The `datePipe` and `currencyPipe` instances are created directly in the component for use in column formatter functions.
- Unlike the staff tickets page, there is no edit capability; the page is read-only for the client.
