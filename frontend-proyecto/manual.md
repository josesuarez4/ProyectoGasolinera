# Manual

## Landing Page (`/`)

### Purpose

The landing page is the public entry point for the application. It presents the brand, a short value proposition, an about-us section, and a service summary for the gas station management platform.

### Visibility and routing

- Route: `/`
- Public users can access it.
- Authenticated staff users (`ADMIN`, `MANAGER`, `EMPLOYEE`) are redirected away by the route guard to `/staff`.
- Authenticated `CLIENT` users can still access the landing page.
- The page is rendered inside the global app shell, so the header, footer, cart drawer, and toast container come from the root layout, not from the landing component itself.

### UI components used

- `p-button` from PrimeNG for the main call to action.
- `p-carousel` from PrimeNG for the about-us image carousel.
- `app-card` for each service summary card.
- Standard HTML sections and headings for the hero, about, and services areas.
- Global layout components from the app shell: header, footer, cart drawer, and toast.

### Shortcuts and navigation

- `Create account` button
  - Visible only when the user is not authenticated.
  - Navigates to `/register`.
- Carousel controls
  - Previous/next buttons and indicators are available through PrimeNG carousel UI.
  - The carousel auto-advances every 3000 ms.
- Section anchors
  - The page contains `#nosotros` and `#servicios` section ids.
  - The component also defines anchor-style menu entries for About Us and Services, but the current template does not render a menubar, so those entries are not active UI shortcuts yet.

### What happens when the user interacts

- Clicking `Create account` opens the registration page.
- If the page is loaded while the user is signed in as a staff role, the route guard redirects before the landing content is shown.
- The about-us carousel cycles through the three gas-station images and can be navigated manually with carousel controls.
- The service cards are informational only in the current implementation; they do not navigate or trigger actions.
- The landing card component is not configured as clickable here, so clicking a service card does not emit any navigation event.

### Data and API endpoints

- No backend API endpoints are called by the landing page itself.
- The page reads authentication state from `AuthService.isAuthenticated()` to decide whether to show the registration button.
- All visible content is static or sourced from local assets:
  - Hero background: `/img/gasolinera_img.jpg`
  - Carousel images: `./img/ImgGas1.jpg`, `./img/ImgGas2.jpg`, `./img/ImgGas3.jpg`

### Validation rules

- There are no forms or inputs on the landing page.
- Therefore, there are no field-level validation rules on this page.
- The only conditional rendering rule is authentication state:
  - if the user is not logged in, show `Create account`
  - if the user is logged in, hide it

### States and edge cases

- Unauthenticated state
  - Full landing page is visible.
  - `Create account` is shown.
- Authenticated client state
  - Landing page remains accessible.
  - `Create account` is hidden.
- Authenticated staff state
  - Route guard redirects to `/staff` instead of showing the page.
- Carousel empty or broken image state
  - If the image array becomes empty, the carousel has nothing to display.
  - If an image asset is missing, the browser will render a broken image placeholder.
- Responsive layout
  - The page uses a two-column layout for the about section and a responsive service-card grid.
  - On narrow screens, the layout is expected to stack based on CSS breakpoints.
- Accessibility notes
  - Carousel images include `alt` text.
  - Service icons are marked `aria-hidden="true"` because they are decorative.

### Implementation notes

- The landing component stores its content in signals, so the page state is reactive even though the content is mostly static.
- The `companyName`, `slogan`, and `items` signals exist in the component, but the current template does not render all of them.
- The service summaries use the shared `app-card` component with projected subtitle content for the icon.

## Login Page (`/login`)

### Purpose

The login page authenticates existing users and sends them to the correct area of the application based on their role or an optional return URL.

### Visibility and routing

- Route: `/login`
- Public users can access it.
- Authenticated users are redirected back to `/` by `loggedInGuard`.
- The page is also used after successful registration to show a confirmation message.

### UI components used

- `p-message` from PrimeNG for success and error feedback.
- `p-password` from PrimeNG for the password field.
- `p-button` from PrimeNG for the submit action.
- Native form controls bound through Reactive Forms.
- Router links to go back to `/register` or `/`.

### Shortcuts and navigation

- `Register` link
  - Navigates to `/register`.
- `Back to home` link
  - Navigates to `/`.
- Successful login redirect
  - If `returnUrl` is present in the query string, the user is redirected there.
  - Otherwise the page redirects to the default route for the authenticated role.

### What happens when the user interacts

- Typing in the email and password fields updates the reactive form.
- Clicking `Login` submits the form only when it is valid.
- While the request is in flight, the submit button shows a loading state and repeated submits are blocked.
- On success, the token is stored through `AuthService`, the session is restored in memory, and the app navigates to the target route.
- When the page is opened after registration, it shows a success message before the user logs in.

### Data and API endpoints

- Backend endpoint used by `AuthService.login()`:
  - `POST http://localhost:8080/auth/login`
- Request body:
  - `email`
  - `password`
- The backend response is expected to contain a JWT token.
- After the token is applied, the page uses the authenticated role to compute the default redirect when `returnUrl` is not present.

### Validation rules

- `email`
  - Required.
  - Must be a valid email format.
- `password`
  - Required.
  - Must be at least 6 characters long.
- The submit action marks all controls as touched when the form is invalid.
- The `Login` button is disabled while the form is invalid.

### States and edge cases

- Unauthenticated state
  - The login form is available.
- Authenticated state
  - The route guard redirects away before the form is shown.
- Registration success state
  - If `registered=true` is present in the query string, a success message is displayed.
- Invalid credential state
  - A `401` response shows `Invalid credentials`.
- Generic failure state
  - Any other error shows `Login failed. Please try again.`
- Submission in progress
  - The page keeps `submitting` true until the request completes or fails.
- Missing or invalid `returnUrl`
  - The page falls back to the default role route.

### Implementation notes

- The page is built with a non-nullable reactive form.
- `AuthService.login()` stores the JWT and updates the authentication signals through its internal token application logic.
- The login page does not auto-submit on enter unless the browser submits the native form normally.

## Register Page (`/register`)

### Purpose

The register page creates a new client account and then sends the user to the login page.

### Visibility and routing

- Route: `/register`
- Public users can access it.
- Authenticated users are redirected back to `/` by `loggedInGuard`.
- After success, the page navigates to `/login` with `registered=true`.

### UI components used

- `p-message` from PrimeNG for error feedback.
- `p-password` from PrimeNG for the password field.
- `p-button` from PrimeNG for the submit action.
- Native form controls bound through Reactive Forms.
- Router links to go back to `/login` or `/`.

### Shortcuts and navigation

- `Login` link
  - Navigates to `/login`.
- `Back to home` link
  - Navigates to `/`.
- Successful registration redirect
  - Navigates to `/login?registered=true`.

### What happens when the user interacts

- Typing in the form updates the reactive form state.
- Clicking `Register` submits only when all controls are valid.
- While the request is in flight, the submit button shows a loading state and repeated submits are blocked.
- On success, the page does not log the user in automatically; it moves them to login instead.
- On failure, the page shows a message and keeps the user on the registration form.

### Data and API endpoints

- Backend endpoint used by `AuthService.register()`:
  - `POST http://localhost:8080/auth/register`
- Request body:
  - `name`
  - `email`
  - `password`
  - `birthDate`
- The backend response is expected to be empty on success.

### Validation rules

- `name`
  - Required.
  - Must be at least 2 characters long.
- `birthDate`
  - Required.
- `email`
  - Required.
  - Must be a valid email format.
- `password`
  - Required.
  - Must be at least 6 characters long.
- The submit action marks all controls as touched when the form is invalid.
- The `Register` button is disabled while the form is invalid.

### States and edge cases

- Unauthenticated state
  - The registration form is available.
- Authenticated state
  - The route guard redirects away before the form is shown.
- Duplicate email state
  - A `409` response shows `Email already registered`.
- Generic failure state
  - Any other error shows `Registration failed. Please try again.`
- Submission in progress
  - The page keeps `submitting` true until the request finishes or fails.
- Successful registration state
  - The user is not logged in automatically and must go through login.

### Implementation notes

- The page uses the same auth service as login, but it only registers a new account.
- The birth date field is a plain date input, so validation is limited to presence rather than custom date range logic.
- The password field uses PrimeNG strength hints, but the actual enforced rule is only minimum length.
