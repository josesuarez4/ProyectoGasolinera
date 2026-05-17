# Manual: Product Catalog (for clients and users)

## Product Catalog Page (`/catalog` and `/client/catalog`)

### Purpose

The product catalog serves as the marketplace where users can browse the store's inventory. It allows public users to view what's available and registered clients to add products to their shopping cart, including fuel options.

### Visibility and routing

- **Route `/catalog`**: Accessible to unauthenticated (anonymous) users and clients.
- **Route `/client/catalog`**: Specifically for authenticated clients.
- **Guards**: 
  - Staff users (`ADMIN`, `MANAGER`, `EMPLOYEE`) are redirected away from these routes.
  - Public users trying to access `/client/catalog` are redirected to login.
- The page is part of the main application layout, including the global header, footer, and (for clients) the cart drawer.

### UI components used

- `app-card`: A custom shared component used to display each product and fuel item.
- `p-button` (PrimeNG): Used for "Add to Cart" actions, category filters, and sorting controls.
- `p-inputText` (PrimeNG): The search bar for product names.
- `p-tag` (PrimeNG): Displays the availability status (Available/Out of Stock).
- `p-inputNumber` (PrimeNG): Allows clients to specify the exact number of liters for fuel products.
- `p-dialog` (PrimeNG): A modal window used to show expanded product details for clients.
- `p-progressSpinner` (PrimeNG): Shown while product data is being fetched from the backend.
- `p-message` (PrimeNG): Displays error messages if the data fails to load.

### Shortcuts and navigation

- **Search input**: Filters the list in real-time as the user types.
- **Category chips**: A horizontal list of buttons to filter products by their category (e.g., "Drinks", "Food").
- **Sort buttons**: Quick actions to sort the grid by Name, Stock, or Price. Clicking the same field twice toggles between ascending and descending order.
- **Product Card**:
  - For clients, clicking the card opens the details modal.
  - Hovering over a card provides a subtle lift effect to indicate interactivity.
- **Add to Cart**: 
  - A shopping cart icon on each product card.
  - A large button inside the details modal.

### What happens when the user interacts

- **Anonymous User**:
  - Can see all standard store products.
  - Can search, filter by category, and sort.
  - Cannot see the "Gasoline" section.
  - Cannot click cards to see details or add items to a cart.
- **Client User**:
  - Sees a prominent "Gasoline" section at the top for refueling.
  - Can adjust fuel liters (1L to 200L) before adding to the cart.
  - Can add any available product to their cart.
  - Can view detailed descriptions in a modal by clicking on a product card.
- **Dynamic Filtering**: Searching or changing categories updates the visible products instantly without page reloads or new API requests.

### Data and API endpoints

- **Endpoint**: `GET http://localhost:8080/products/available`
- **Service**: `CatalogService.getAvailableProducts()`
- The component fetches all available products upon initialization and then manages filtering and sorting locally.
- **Fuel Detection**: The system automatically identifies fuel products by checking if their category name contains "combustible", "fuel", or "gasolina".

### Validation rules

- **Fuel quantity**: Limited to a minimum of 1 liter and a maximum of 200 liters per entry.
- **Stock control**: 
  - If a product has `currentStock = 0`, it is labeled "Out of Stock".
  - The "Add to Cart" button is automatically disabled for out-of-stock items.
- **Authentication**: The "Add to Cart" and "Product Details" functionalities are strictly disabled unless the user is logged in as a `CLIENT`.

### States and edge cases

- **Loading state**: A spinner is centered on the screen while the `CatalogService` is fetching data.
- **Error state**: If the backend is unreachable or returns an error, a message "Error al cargar los productos" is displayed.
- **Empty state**: If no products match the current search or category filter, a "No products found" message appears.
- **Out of Stock items**: These remain visible in the catalog to show the full range of offerings, but interactions are limited.
- **Staff access**: If a staff member manually navigates to the catalog, they will see the products but won't be able to interact with them like a client (e.g., no cart functionality).

### Implementation notes

- **Reactive state**: Uses Angular signals and `ChangeDetectionStrategy.OnPush` for optimized rendering performance.
- **Local filtering**: To reduce server load, once the products are loaded, all filtering and sorting logic is executed in the browser.
- **Responsive design**: The product grid uses CSS Grid with `auto-fill` to adapt to different screen sizes, ensuring a premium look on both mobile and desktop.
- **Gasoline handling**: Fuel products are filtered out of the main grid and shown in a dedicated section with a specific UI for volume selection.
