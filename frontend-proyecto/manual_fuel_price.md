# Fuel Price Information Manual

## Fuel Price Page (`/fuel-price`)

### Purpose

The Fuel Price page provides real-time information about the current prices of different fuel types available at the gas station. It is designed to be a public, transparent window for customers to check rates before visiting the station.

### Visibility and Routing

- **Route**: `/fuel-price`
- **Visibility**: Publicly accessible to all users (clients, staff, and unauthenticated visitors).
- The page is part of the public area of the application and does not require a login.

### UI Components Used

- `p-progressSpinner`: Used during the data fetching phase to provide visual feedback to the user.
- `app-card`: A custom container used to highlight the "best offer" or current prices in a premium layout.
- `p-tag`: Displays the formatted opening hours with a distinctive status badge style.
- Custom CSS: A specialized `hero-container` layout with vibrant gradients and iconography.

### Sections and Functionality

#### 1. Hero Section
- **Location Details**: Displays the official address, locality, and province of the station (retrieved from the API).
- **Opening Hours**: Shows the station's schedule, automatically translated from technical codes (e.g., "L-D" becomes "Monday to Sunday").

#### 2. Main Price Display
- **Gasolina 95**: Shows the current price per liter for 95 octane gasoline with a distinctive color-coded dot.
- **Diésel A**: Shows the current price per liter for standard diesel.
- **Automatic Currency Formatting**: Prices are displayed with the "€/L" suffix.
- **Dynamic Presence**: Each fuel type only appears if the backend data provides a price for it.

### Data and API Endpoints

- **Backend Service**: `FuelService`
- **Primary Endpoint**: `/api/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/38`
  - This is a proxy to the official Spanish Ministry of Industry, Trade and Tourism API.
  - The province ID `38` corresponds to Santa Cruz de Tenerife.
- **Data Processing**:
  - The component filters the entire province list to find the specific station with `IDEESS: 16015` or the label `PLENERGY`.
  - The `ListaEESSPrecio` array from the JSON response is mapped to local objects.

### States and Edge Cases

- **Loading State**: A full-page spinner appears while the component waits for the external API response.
- **Empty State**: If the API returns no results or the specific station ID is not found, a "No station found" message is displayed.
- **API Errors**: If the external service is down or a network error occurs, the loading state is cancelled, and an error is logged in the console.
- **Data Formatting**: The opening hours string is parsed to replace Spanish abbreviated days with full English names for better accessibility.

### Implementation Notes

- **Browser-Only Execution**: Data fetching is restricted to the browser (`isPlatformBrowser`) to avoid issues during server-side rendering (SSR) with external API calls.
- **Proxy Configuration**: The `/api` prefix in the `BASE_URL` is configured in the development proxy to avoid CORS issues with the external `sedeaplicaciones.minetur.gob.es` server.
- **Change Detection**: Uses `cdr.detectChanges()` to ensure the UI updates immediately after receiving asynchronous data from the `HttpClient`.
