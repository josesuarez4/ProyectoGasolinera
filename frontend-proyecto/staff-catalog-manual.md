# Staff Product Catalog (`/staff/catalog`)

## Purpose

The staff product catalog page is the central inventory management screen for staff users. It displays all products, enables filtering and sorting, and supports editing product details, toggling active status, and viewing detailed product information.

## Visibility and routing

- Route: `/staff/catalog`
- Accessible only to authenticated staff roles: `ADMIN`, `MANAGER`, and `EMPLOYEE`.
- Rendered inside the staff layout shell, so the staff sidebar and header are present.
- Access is protected by `roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])` in `app.routes.ts`.

## UI components used

- `app-table` for the main catalog table and row actions.
- `p-dialog` from PrimeNG for product detail modal and sales estimation modal.
- `app-detail-view` for the product detail drawer content.
- `app-generic-form` for editing product data.
- `p-message` for status and error notifications inside the page.
- `p-tag` for sales trend badges in the estimation dialog.
- Standard HTML form controls for search, category, status filters, and sort controls.

## Shortcuts and navigation

- Table row click
  - Opens the product detail modal for the selected item.
- Action buttons in the table
  - `Edit` opens the generic form overlay.
  - `Estimate Sales` opens the sales projection dialog.
  - `Deactivate` or `Reactivate` toggles product activity status.
- Filters
  - Product search by name or supplier text.
  - Category filter.
  - Status filter for active/inactive/all products.
  - Sort field selector and sort order toggle.
  - `Clear filters` resets the filter state.

## What happens when the user interacts

- Typing in the search field updates the `productNameFilter`, refining the visible rows.
- Changing category or status triggers a reload of products from the backend.
- Changing sort field or order updates the table sort without reloading.
- Editing a product opens a form with pre-filled values and saves via `onSaveProduct()`.
- Clicking a row opens the detail drawer with key product metrics and description.
- Estimation action requests projected sales data and displays trend, growth, and confidence.
- Deactivation shows a confirmation dialog for `ADMIN`; reactivation happens immediately.

## Data and API endpoints

- Loads product list with `ProductService.getAllProductsAdmin(...)`.
- Loads category and market data with `ProductService.getAllCategories()` and `CategoryRevenueService.getRevenueByCategory()`.
- Updates product data with `ProductService.updateProduct(id, dto)`.
- Toggles product active state with `ProductService.setProductActive(id, active)`.
- Requests sales forecast from `ProductEvolutionService.estimateProductSales(product.name)`.
- Product list requests include current filter and sort parameters:
  - `sortBy`
  - `sortOrder`
  - `name`
  - `supplierName`
  - `categoryId`
  - `active`

## Validation rules

- The generic product edit form includes:
  - `name`: required.
  - `description`: optional.
  - `categoryId`: required.
  - `salePrice`: optional currency field.
  - `currentStock`: optional numeric field.
- The page does not validate filter fields beyond the built-in select and input behavior.

## States and edge cases

- Loading state
  - `loadingProducts` is true while products are fetched.
  - `loadingRevenue` is true while category revenue data is fetched.
- Empty state
  - If no products match current filters, the table shows a local empty message.
- Error state
  - Errors from product loading, saving, or estimation are displayed in `errorMessage`.
- Permission state
  - `MANAGER` and `ADMIN` can see edit actions.
  - Only `ADMIN` can deactivate or reactivate products.
- Confirmation flow
  - Deactivation asks for confirmation before sending the request.
- Detail display
  - Clicking a row shows the product detail modal; closing it clears the selected product.

## Implementation notes

- The page is built using Angular standalone component architecture with `ChangeDetectionStrategy.OnPush`.
- The catalog uses signals for reactive state: filters, loading flags, selected product, dialogs, and messages.
- The product table columns include stock, price, monthly sales, supplier, category, and status.
- The product detail modal displays a circular image placeholder, stock warning styling, price, category, and description.
- `app-generic-form` is reused for product editing, configured dynamically from the loaded categories.
- Sales estimation is shown in a dedicated `p-dialog` with trend severity colors and a confidence bar.
- The page keeps `statusMessage` and `errorMessage` signals to show user feedback and help troubleshoot failures.
