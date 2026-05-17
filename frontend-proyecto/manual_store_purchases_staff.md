# Store Purchases Staff Manual

## Store Purchase Page (`/staff/store-purchases`)

### Purpose

The Store Purchase page serves as a Point-of-Sale (POS) terminal for the gas station staff. It allows employees to register physical sales in the store, manage a shopping cart in real-time, and process checkouts for walk-in customers.

### Visibility and Routing

- **Route**: `/staff/store-purchases`
- **Access**: Restricted to staff roles (`ADMIN`, `MANAGER`, `EMPLOYEE`).
- This workspace is designed for internal use only, providing the tools needed to facilitate store transactions.

### UI Components Used

- `app-table`: Displays the searchable catalogue of physical products available in the store.
- `app-card`: (Through the cart integration) manages the layout of the checkout sidebar.
- `p-button`: Used for adding/removing items, adjusting quantities, and completing the final purchase.
- `p-dialog`: (If applicable) used for confirmation messages after a successful transaction.

### Sections and Functionality

#### 1. Product Catalogue (Left Panel)
- **Real-time Search**: Staff can find products by name, description, category, or internal code.
- **Category Filtering**: A dropdown menu allows for quick navigation through different product families.
- **Quick Add**: Each row in the table includes an action button to add the item directly to the active cart.

#### 2. Cart Management (Right Sidebar)
- **Itemized List**: Shows all products added to the current session, their unit price, and total per line.
- **Quantity Control**: Staff can increase or decrease units. The system automatically blocks additions that exceed the current stock levels.
- **Live Summary**: Automatically calculates the Subtotal, IGIC (Tax), and the final Total amount.

#### 3. Client Loyalty Linking
- **Loyalty Code Field**: An optional input where the staff can enter a customer's loyalty code (e.g., `FID-000000`).
- **Impact**: Linking a code ensures the purchase is recorded in the client's history and calculates points correctly.

#### 4. Checkout and Payment
- **Payment Method**: Staff can select between "Cash" or "Card" to record the transaction type accurately.
- **Complete Purchase**: The final button processes the sale, updates the inventory, and clears the cart for the next customer.
- **Clear Cart**: A secondary action to reset the current session if the customer decides not to proceed.

### Data and API Endpoints

- **Backend Service**: `OrderService` and `CartService`.
- **Checkout Logic**:
  - Sends a payload containing the item list, total price, payment type, and optional loyalty code to the backend.
  - Updates the central database to reflect the decrease in stock for each sold item.

### States and Edge Cases

- **Out of Stock State**: If a product has zero stock, it is either hidden or clearly marked as unavailable for sale.
- **Empty Cart State**: The checkout button is disabled, and a message invites the staff to add products.
- **Search No Results**: Shows a friendly message if the filter criteria don't match any store product.
- **Cash Register Requirement**: A cash register session **must be open** for the authenticated staff member to complete a purchase. If no register is open, an error message will appear during checkout.
- **Processing State**: The "Complete purchase" button shows a loading spinner during the backend transaction to prevent double-charging or duplicate orders.

### Implementation Notes

- **Persistent Cart State**: The cart is managed via a reactive service, ensuring that the total is always synchronized with the item list.
- **Stock Validation**: Input fields for quantity are constrained by `min` and `max` attributes based on real-time inventory data.
- **Tax Calculation**: Specifically configured for IGIC (Canary Islands indirect tax) as part of the local station requirements.
