import { Routes } from '@angular/router';
import { roleGuard } from './security/guards/role-guard';
import { staffLandingGuard } from './security/guards/staff-landing-guard';
import { loggedInGuard } from './security/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/public/landing/landing').then((m) => m.Landing),
    canActivate: [roleGuard(['!ADMIN', '!MANAGER', '!EMPLOYEE'])],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/public/auth/login/login').then((m) => m.Login),
    canActivate: [loggedInGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/public/auth/register/register').then((m) => m.Register),
    canActivate: [loggedInGuard],
  },
  {
    path: 'fuel-price',
    loadComponent: () => import('./pages/public/fuel-price/fuel-price').then((m) => m.FuelPrice),
    canActivate: [roleGuard(['!ADMIN', '!MANAGER', '!EMPLOYEE'])],
  },
  {
    path: 'charts-demo',
    loadComponent: () => import('./pages/charts-demo/charts-demo').then((m) => m.ChartsDemoPage),
    canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/client/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [roleGuard(['CLIENT'])],
  },
  {
    path: 'catalog',
    loadComponent: () => import('./pages/shared/catalog/catalog').then((m) => m.ProductsCatalog),
    canActivate: [roleGuard(['!ADMIN', '!MANAGER', '!EMPLOYEE'])],
  },
  {
    path: 'client/catalog',
    loadComponent: () => import('./pages/shared/catalog/catalog').then((m) => m.ProductsCatalog),
    canActivate: [roleGuard(['CLIENT'])],
  },
  {
    path: 'client/my-orders',
    loadComponent: () => import('./pages/client/orders/orders').then((m) => m.OrdersClient),
    canActivate: [roleGuard(['CLIENT'])],
  },
  {
    path: 'client/my-invoices',
    loadComponent: () => import('./pages/client/my-invoices/my-invoices').then((m) => m.MyInvoices),
    canActivate: [roleGuard(['CLIENT'])],
  },
  {
    path: 'client/points',
    loadComponent: () => import('./pages/client/points/points').then((m) => m.Points),
    canActivate: [roleGuard(['CLIENT'])],
  },
  {
    path: 'staff',
    loadComponent: () =>
      import('./pages/staff/staff-layout/staff-layout').then((m) => m.StaffLayoutPage),
    canActivate: [roleGuard(['EMPLOYEE', 'MANAGER', 'ADMIN'])],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [staffLandingGuard],
        children: [],
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/staff/dashboard/staff-dashboard').then((m) => m.StaffDashboardPage),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/staff/users/staff-users').then((m) => m.StaffUsersPage),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./pages/staff/clients/staff-clients').then((m) => m.StaffClientsPage),
        canActivate: [roleGuard(['MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/staff/catalog/staff-catalog').then((m) => m.StaffCatalogPage),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'supplier-orders/new',
        loadComponent: () =>
          import('./pages/staff/orders/new-supplier-order/staff-new-supplier-order').then(
            (m) => m.StaffNewSupplierOrderPage,
          ),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'store-purchases',
        loadComponent: () =>
          import('./pages/staff/store-purchases/store-purchases').then((m) => m.StorePurchasesPage),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/staff/orders/staff-orders').then((m) => m.StaffOrdersPage),
        canActivate: [roleGuard(['ADMIN', 'MANAGER', 'EMPLOYEE'])],
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./pages/staff/tickets/staff-tickets').then((m) => m.StaffTicketsPage),
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
      },
      {
        path: 'cash-registers',
        loadComponent: () =>
          import('./pages/staff/cash-registers/staff-cash-registers').then(
            (m) => m.StaffCashRegistersPage,
          ),
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
      },
      {
        path: 'cash-registers/:cashRegisterId/tickets',
        loadComponent: () =>
          import('./pages/staff/cash-registers/tickets/cash-register-tickets').then(
            (m) => m.CashRegisterTicketsPage,
          ),
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
      },
      {
        path: 'my-tickets',
        loadComponent: () =>
          import('./pages/staff/my-tickets/my-tickets').then((m) => m.MyTicketsPage),
        canActivate: [roleGuard(['EMPLOYEE'])],
      },
      {
        path: 'admin-catalogue-analysis',
        loadComponent: () =>
          import('./pages/staff/admin-catalogue-analysis/admin-catalogue-analysis').then(
            (m) => m.AdminCatalogueAnalysisPage
          ),
        canActivate: [roleGuard(['ADMIN'])],
      },
    ],
  },
];