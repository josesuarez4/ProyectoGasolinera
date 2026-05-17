# Staff Orders Manual

## Staff Orders Page (`/staff/orders`)

### Purpose

The Staff Orders page centralizes order management for employees, managers, and administrators. It allows staff to review client purchase orders, process order status changes, and manage supplier orders from a single consolidated interface.

### Visibility and Routing

- **Route**: `/staff/orders`
- **Access**: Restricted to staff roles (`ADMIN`, `MANAGER`, `EMPLOYEE`).
- The page is available inside the staff layout and is protected by the staff route guard.

### UI Components Used

- `app-table`: Main interface for displaying client or supplier order lists.
- `p-button`: Used for actions such as clearing filters, switching views, and triggering table actions.
- `p-dialog`: Displays order details in a modal dialog when a row is clicked.
- `app-detail-view`: Used within the dialog to show order metadata and order items.
- `app-supplier-orders-filter` and `app-supplier-order-requests`: Specialized components for supplier order filtering and request handling.
- `p-tag`: Used to visually indicate order status severity inside the detail view.

### Sections and Functionality

#### 1. Order Source Toggle
- Staff can switch between `Client orders` and `Supplier orders` using the top tab-style toggle.
- The current view controls the filters and table content shown on the page.

#### 2. Client Orders View
- **Filters**:
  - Order ID / Loyalty / Client ID text search.
  - Date picker filter.
  - Status dropdown with options for `All statuses`, `Pending`, `Picked up`, `Declined`, and `Cancelled`.
  - Sort button for toggling order date between newest-first and oldest-first.
- **Table Columns**:
  - `Order ID`
  - `Loyalty / Client`
  - `Created at`
  - `Status`
  - `Items`
  - `Max pickup date`
  - `Total`
- **Actions**:
  - Cancel order: visible when the order can still change status.
  - Pickup order: allows marking a pending order as picked up.
- **Behavior**:
  - The table is paginated and supports row clicking to open detailed order information.
  - `Employee` users see a note that their view is limited to orders created in the last 14 days.

#### 3. Supplier Orders View
- **Filters**:
  - Supplier name search.
  - Creator name search.
  - Date filter.
  - Status filter with options for `All statuses`, `Pending`, `Accepted`, and `Declined`.
  - Sort toggle for date order.
- **Table Columns**:
  - `ID`
  - `Supplier`
  - `Status`
  - `Creator`
  - `Created at`
- **Behavior**:
  - Uses a distinct supplier order request component to render the list and manage row clicks.
  - Supports the same detail dialog experience as client orders.

#### 4. Order Details Dialog
- Displays a summary of the selected order in a modal overlay.
- Sidebar shows:
  - Order creation date.
  - Client or supplier identity depending on the active view.
  - Creator information for supplier orders.
  - Total amount.
- Main section shows:
  - A list of ordered items with product name, quantity, unit price, and subtotal.
  - A validation note for supplier orders if a validator has approved the request.

### Data and API Endpoints

- **Backend Services**:
  - `MyOrdersClientService` for client orders.
  - `MyOrdersSupplierService` for supplier orders.
- **Filtering Logic**:
  - Client orders support loyalty code, order date, and status filtering.
  - Supplier orders support supplier name, creator name, date, and status filtering.
- **Sorting**:
  - Both views support sorting by created date in ascending or descending order.

### States and Edge Cases

- **Loading state**: A loading indicator is shown while fetching orders or processing status updates.
- **Empty state**: Shows a friendly empty table message when no orders match the active filters.
- **Error state**: Displays an error message if the backend request fails.
- **Active filters state**: The `Clear filters` button is only enabled when a filter is active.
- **Order status changes**: Actions are disabled during update operations to prevent duplicate requests.

### Implementation Notes

- The page uses Angular signals and computed values for reactive state management.
- Client and supplier orders are kept separate with distinct services and filtered row collections.
- The detail dialog uses the same `app-detail-view` pattern for both order types, ensuring a consistent staff experience.
- Status severity is mapped to visual tags so that `pending`, `picked_up`/`accepted`, and `cancelled`/`declined` states each have distinct styling.
