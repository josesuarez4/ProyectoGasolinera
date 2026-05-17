# My Orders Client Manual

## My Orders Page (`/client/my-orders`)

### Purpose

The My Orders page allows clients to track their personal purchase history, monitor the status of active requests, and review the details of past transactions at the gas station store.

### Visibility and Routing

- **Route**: `/client/orders`
- **Access**: Restricted to users with the `CLIENT` role.
- Unauthenticated users or staff members trying to access this route will be redirected based on the application's security guards.

### UI Components Used

- `app-card`: Each order is represented by a clickable card that displays a summary of the transaction.
- `p-tag`: Used to provide a quick visual cue of the order status (e.g., Pending, Completed, Cancelled).
- `p-dialog`: A modal window that opens when an order card is clicked, showing a comprehensive breakdown of the items purchased.
- `p-progressSpinner`: Indicates data loading state from the backend.
- `p-button`: Used for specific actions like order cancellation.

### Sections and Functionality

#### 1. Orders Grid
- Displays a collection of cards representing each order.
- **Summarized Info**: Shows the Order ID, the date it was created, and the total price formatted in Euros.
- **Status Indicator**: Uses color-coded tags to represent the current state of the order.

#### 2. Order Details Dialog
- **Product List**: Displays every item included in the order, its quantity, and the total cost for that specific line item.
- **Pickup Information**: If applicable, shows the `Max Pickup Date` for the products.
- **Financial Breakdown**: Summarizes the total amount due/paid for the entire order.

#### 3. Order Cancellation
- Clients have the ability to cancel an order directly from the detail dialog **only if the status is currently `PENDING`**.
- A "Cancel Order" button appears at the bottom of the dialog for eligible orders.
- Once cancelled, the status updates in real-time, and the visual tag reflects the new state.

### Data and API Endpoints

- **Backend Service**: `OrderService`
- **Fetching Logic**: The component automatically retrieves the orders associated with the authenticated user's ID.
- **Status Mapping**:
  - `PENDING`: Waiting for processing (Yellow/Warning).
  - `COMPLETED`: Successfully picked up/delivered (Green/Success).
  - `CANCELLED`: Order annulled (Red/Danger).
  - `PROCESSING`: Currently being prepared (Blue/Info).

### States and Edge Cases

- **Loading State**: A spinner is shown while the order list is being fetched from the database.
- **Empty State**: If the client has never placed an order, a friendly "No orders found" message with a shopping bag icon is displayed.
- **Error State**: If the backend request fails, an error message with a warning icon informs the user to try again later.
- **Date Handling**: Includes a fallback for missing dates, ensuring the UI doesn't break if a record is incomplete.

### Implementation Notes

- **Reactive Updates**: The cancellation action triggers a state refresh to ensure the list reflects the most recent data without a page reload.
- **Modal Logic**: Uses `dismissableMask` so users can close the details dialog by clicking outside of it for a smoother experience.
- **Currency and Date Pipes**: Leverages standard Angular pipes for consistent formatting of prices (`EUR`) and dates (`mediumDate`).
