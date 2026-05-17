# Staff Users Manual

## Staff Users Page (`/staff/users`)

### Purpose

The Staff Users page enables administrators to manage all application users, including employees and clients. It provides user search, filtering, profile inspection, editing, creation, and deletion capabilities from a single admin interface.

### Visibility and Routing

- **Route**: `/staff/users`
- **Access**: Restricted to `ADMIN` role only.
- The page is part of the staff dashboard area and is protected by role-based routing.

### UI Components Used

- `app-table`: Main user list with columns, actions, pagination, and row click support.
- `p-dialog`: Displays a user profile detail modal.
- `app-detail-view`: Used inside the modal to render selected user profile information.
- `app-generic-form`: Used to create and edit user records with reusable form configuration.
- `p-confirmDialog`: Confirms destructive actions like deleting a user.
- `p-button`: Used for creating new users and triggering user actions.

### Sections and Functionality

#### 1. Filters
- Email search.
- Loyalty code search.
- Role dropdown filter with options for `All roles`, `Admin`, `Manager`, `Employee`, and `Client`.
- `Clear filters` button that becomes active when any filter has a value.

#### 2. User Table
- **Columns**:
  - `ID`
  - `Name`
  - `Role`
  - `Email`
  - `Birth date`
  - `Loyalty code`
  - `Points`
  - `Salary`
  - `Created at`
- **Actions**:
  - Delete user (disabled for the currently authenticated admin and while deletion is in progress).
  - Edit user.
- The table is row-clickable for opening user detail view.
- Includes pagination with `10`, `25`, and `50` rows per page.

#### 3. User Detail Dialog
- Opens when a row is clicked.
- Shows user header information and a summary of role-specific details.
- Sidebar includes:
  - Account ID.
  - Member since date.
  - Access role.
- Main section includes:
  - Name and email.
  - Birth date.
  - Loyalty points for clients or base salary for staff roles.
  - Role-specific details:
    - `CLIENT`: Loyalty code card.
    - Non-client roles: Work schedule agreement with active days and shift hours.

#### 4. User Creation and Editing
- The `New User` button opens a generic form modal for creating a new account.
- Editing a user opens the same form populated with existing data.
- The form includes fields for:
  - Name
  - Email
  - Password (required only when creating a new user)
  - Role
  - Birth date
  - Salary, business days, start time, and end time for employees/managers/admins
- The form uses validation rules such as required fields, minimum password length, and email format.

### Data and API Endpoints

- **Backend services**:
  - `UserService` for user listing, creation, updates, and deletion.
  - `NotificationService` is also injected in the component for staff notifications, although the manual page focuses on user management flows.
- **Filtering logic**:
  - Email and loyalty code filters perform case-insensitive substring matching.
  - Role filter performs exact role matching.

### States and Edge Cases

- **Loading state**: The page shows a spinner while user data is loaded.
- **Empty state**: If no users match current filters, the table shows a message indicating no results.
- **Error state**: A visible error banner appears when a service request fails.
- **Current admin protection**: The delete action is disabled for the admin account currently logged in.
- **Modal state**: Closing the detail or form dialogs resets the selected user state.

### Implementation Notes

- The page is built using Angular standalone component patterns and PrimeNG UI primitives.
- Reactive signals drive table filtering and modal visibility.
- Form fields are dynamically shown or hidden depending on the selected role, so employee-specific schedule fields are only visible for non-client users.
- Date and currency formatting are handled through Angular pipes and helper methods to maintain consistent display.
