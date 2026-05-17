# Staff Dashboard and Management Manual

## Administrative Dashboard (`/staff/dashboard`)

### Purpose

The Staff Dashboard is the central control panel for gas station administrators and managers. Its objective is to provide a 360-degree view of the business status, including operational metrics, sales analysis, financial health, and real-time human resource management.

### Visibility and Routing

- **Route**: `/staff/dashboard`
- **Access**: Restricted to users with `ADMIN`, `MANAGER`, or `EMPLOYEE` roles.
- `CLIENT` users are automatically redirected away from this area for security reasons.
- The dashboard content adapts dynamically based on the user's role (e.g., employees see operational metrics, while administrators have access to detailed financial charts).

### UI Components Used

- `app-card`: Base container for metrics and charts, featuring premium design and soft shadows.
- `app-chart`: Custom component for rendering Chart.js graphs (line, bar, radar, pie, polarArea).
- `p-tag`: To display status and importance badges in the header.
- `app-table`: (Used in other sections) for structured data visualization.

### Sections and Functionality

#### 1. Top Metrics Grid
- Displays Key Performance Indicators (KPIs) such as Total Sales, Active Orders, Registered Users, and Critical Stock.
- Each card includes a representative icon and the current value of the metric.

#### 2. Product Sales Evolution
- **Line Chart**: Visualizes historical trends in units sold.
- **Dynamic Filters**:
  - Period Selector: Day, Week, Month, Year.
  - Category Filter: Allows isolating the evolution of specific product families.
  - Date Range: Manual selection of start and end dates.
  - Product Search: Enables graphing the evolution of an individual product by name.

#### 3. Financial Analysis (ADMIN Only)
- **Income vs Expenses**: Comparative bar chart to evaluate profitability.
- **Sales by Category**: Radar chart showing which product categories are generating the most revenue or order volume.

#### 4. Operational Charts
- **Order Status**: Percentage distribution of orders in preparation, shipped, or completed.
- **Top Products**: Visual identification of top-grossing products.
- **Online vs In-Store Sales**: Comparison of transaction origins.
- **Stock Levels**: Horizontal bar chart to identify products near depletion.
- **Top Employees**: Performance ranking based on order management.
- **Hourly Volume**: Identification of the station's "peak hours."

#### 5. Business Summaries
- **User Summary**: Quick breakdown of total users by role.
- **Top Customers**: Table of customers with the highest monthly spend, identifying the most loyal users.
