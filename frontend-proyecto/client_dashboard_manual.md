# Manual: Client Dashboard (for clients only)

## Client Dashboard Page (`/dashboard`)

### Purpose

The client dashboard provides a high-level overview of the user's interaction with the gas station. It highlights key financial metrics, loyalty points, and recent activity to help clients track their spending and order history at a glance.

### Visibility and routing

- **Route `/dashboard`**: Accessible only to authenticated users with the `CLIENT` role.
- **Guard**: `roleGuard(['CLIENT'])` ensures that only authorized clients can access this view. Staff or unauthenticated users are redirected automatically.
- This is the default landing page for clients after a successful login.

### UI components used

- `app-card`: Custom shared component used to display the summary statistics in a grid.
- `p-table` (PrimeNG): Renders the recent activity list with responsive layout support.
- `p-tag` (PrimeNG): Provides color-coded status labels for transactions.
- `p-progressSpinner` (PrimeNG): Displays a loading state while fetching data from the backend microservices.

### Shortcuts and navigation

- **Overview Grid**: The top section features four main cards for quick data consumption: Total Spent, Average Spent, Valid Purchases, and (if applicable) Loyalty Points.
- **Recent Activity**: A dedicated table showing the most recent transactions, limited to 5 entries for clarity.
- **Responsive Table**: The activity list automatically switches to a scrollable layout on smaller screens to maintain usability.

### What happens when the user interacts

- **Initial Load**: The page identifies the logged-in user and fetches their loyalty points and order history concurrently.
- **Data Aggregation**: The dashboard dynamically calculates spending totals and averages based on the fetched order history.
- **Status Mapping**:
  - `PENDING`: Displayed as "Pendiente" with a warning (yellow) indicator.
  - `PICKED_UP`: Displayed as "Recogido" with a success (green) indicator.
  - `CANCELLED`: Displayed as "Cancelado" with a danger (red) indicator.
- **Automatic Formatting**: Order totals are automatically displayed in EUR currency format, and dates are formatted using the `mediumDate` pipe.

### Data and API endpoints

- **Backend Endpoints**:
  - `GET http://localhost:8080/loyalty-card/{clientId}` (Loyalty points)
  - `GET http://localhost:8080/orders/client/{clientId}` (Order history)
- **Service**: `DashboardService.getDashboardData(clientId)`
- The service uses `forkJoin` to fetch data from both endpoints simultaneously, ensuring a faster perceived loading time.

### Validation rules

- **Identity Verification**: The dashboard requires a valid user ID from the `AuthService`. If no ID is found, the loading state ends without attempting API calls.
- **Statistical Calculation**: Cancelled orders are excluded from "Total Spent" and "Average Spent" calculations to provide an accurate reflection of completed business.

### States and edge cases

- **Loading state**: A centered spinner is shown until all backend data has been received.
- **Empty statistics**: If a user has never made a purchase, spending statistics will show `€0.00`.
- **Empty activity list**: If no orders are found, the table displays a "No recent activity found" message.
- **Missing Loyalty Data**: If the user does not have a loyalty card or the service is unavailable, the "Loyalty Points" card is gracefully omitted without breaking the page.
- **Partial Service Failure**: The dashboard is designed to handle individual service failures (like loyalty card timeouts) while still displaying the rest of the available information.

### Implementation notes

- **Concurrency**: Leverages RxJS `forkJoin` to aggregate data from multiple independent backend services.
- **Status Helpers**: Implements `getStatusSeverity` and `getStatusLabel` methods to decouple backend status strings from frontend presentation logic.
- **State Management**: Uses local component state with manual `ChangeDetectorRef.detectChanges()` calls to ensure UI updates correctly when data arrives from asynchronous services.
