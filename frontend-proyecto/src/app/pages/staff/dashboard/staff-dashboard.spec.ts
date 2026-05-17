import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal, Component, Input } from '@angular/core';
import { StaffDashboardPage } from './staff-dashboard';
import { UserService, UserSummary, TopClientRecord } from '../../../services/users/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ProductService, Category } from '../../../services/products/product.service';
import {
  CategoryRevenueDTO,
  CategoryRevenueService,
} from '../../../services/category-revenue/category-revenue';
import {
  StaffProfileService,
  StaffProfile,
} from '../../../services/staff-profile/staff-profile.service';
import { AnalyticsService, FinancialMetricResponse, ProductSalesPoint } from '../../../services/analytics/analytics.service';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { ChartComponent } from '../../../components/chart/chart.component';

// Stub that replaces ChartComponent so jsdom never tries to acquire a canvas context.
@Component({ selector: 'app-chart', standalone: true, template: '' })
class ChartStub {
  @Input() type = '';
  @Input() title = '';
  @Input() height = '';
  @Input() data: any = null;
  @Input() options: any = null;
  @Input() loading = false;
  @Input() emptyMessage = '';
}

// ── Shared mock data ──────────────────────────────────────────────────────────

const mockSummary: UserSummary = {
  totalUsers: 10,
  totalManagers: 2,
  totalEmployees: 3,
  totalClients: 5,
};

const mockTopClients: TopClientRecord[] = [
  { id: 1, name: 'Client A', email: 'a@test.com', totalSpent: 200 },
  { id: 2, name: 'Client B', email: 'b@test.com', totalSpent: 150 },
];

const mockIncome: FinancialMetricResponse = {
  metric: 'income',
  scope: 'week',
  from: '2026-04-28T00:00:00',
  to: '2026-05-07T14:00:00',
  amount: 1000,
};
const mockExpenses: FinancialMetricResponse = {
  metric: 'expenses',
  scope: 'week',
  from: '2026-04-28T00:00:00',
  to: '2026-05-07T14:00:00',
  amount: 300,
};
const mockProfit: FinancialMetricResponse = {
  metric: 'profit',
  scope: 'week',
  from: '2026-04-28T00:00:00',
  to: '2026-05-07T14:00:00',
  amount: 700,
};

const mockStaffProfile: StaffProfile = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  birthDate: '1990-01-15',
  role: 'MANAGER',
  salary: 5000,
  startTime: '09:00',
  endTime: '17:00',
  days: 'Mon-Fri',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
};

const mockSalesPoints: ProductSalesPoint[] = [
  { date: '2026-05-01', product: 'Diesel', unitsSold: 40, revenue: 80 },
  { date: '2026-05-02', product: 'Diesel', unitsSold: 55, revenue: 110 },
  { date: '2026-05-01', product: 'Gasolina 95', unitsSold: 30, revenue: 60 },
];

const mockCategoryRevenue: CategoryRevenueDTO[] = [
  { categoryId: 1, categoryName: 'Combustible', totalRevenue: 1250, orderCount: 14 },
  { categoryId: 2, categoryName: 'Cafetería', totalRevenue: 430, orderCount: 22 },
  { categoryId: 3, categoryName: 'Lubricantes', totalRevenue: 210, orderCount: 8 },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Combustible', description: '' },
  { id: 2, name: 'Cafetería', description: '' },
];

// ── Mock factories ────────────────────────────────────────────────────────────

function makeAuthMock(role: string, userId = 1) {
  return {
    currentRole: signal(role),
    currentUser: signal({ id: userId, name: 'Test User', email: 'test@example.com' }),
  };
}

function makeUserServiceMock(
  summary = mockSummary,
  topClients: TopClientRecord[] = mockTopClients,
): Partial<UserService> {
  return {
    getUserSummary: jest.fn().mockReturnValue(of(summary)),
    getTopClientsBySpend: jest.fn().mockReturnValue(of(topClients)),
  };
}

function makeAnalyticsMock(
  income = mockIncome,
  expenses = mockExpenses,
  profit = mockProfit,
  points: ProductSalesPoint[] = mockSalesPoints,
): Partial<AnalyticsService> {
  return {
    getIncome: jest.fn().mockReturnValue(of(income)),
    getExpenses: jest.fn().mockReturnValue(of(expenses)),
    getProfit: jest.fn().mockReturnValue(of(profit)),
    getProductEvolution: jest.fn().mockReturnValue(of(points)),
    getProductAnalytics: jest.fn().mockReturnValue(of([])),
  };
}

function makeCategoryRevenueMock(data = mockCategoryRevenue): Partial<CategoryRevenueService> {
  return {
    getRevenueByCategory: jest.fn().mockReturnValue(of(data)),
  };
}

function makeStaffProfileMock(profile = mockStaffProfile): Partial<StaffProfileService> {
  return { getStaffProfile: jest.fn().mockReturnValue(of(profile)) };
}

function makeProductServiceMock(categories = mockCategories): Partial<ProductService> {
  return {
    getAllCategories: jest.fn().mockReturnValue(of(categories)),
  };
}

function makeMetricsMock(): Partial<MetricsService> {
  return {
    getIncomeByPaymentType: jest.fn().mockReturnValue(of([])),
    getOrdersByStatus: jest.fn().mockReturnValue(of([])),
    getTopProducts: jest.fn().mockReturnValue(of([])),
    getProductStock: jest.fn().mockReturnValue(of([])),
    getTopEmployeesBySales: jest.fn().mockReturnValue(of([])),
    getSalesByOrigin: jest.fn().mockReturnValue(of([])),
    getHourlySales: jest.fn().mockReturnValue(of([])),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('StaffDashboardPage', () => {
  let component: StaffDashboardPage;
  let fixture: ComponentFixture<StaffDashboardPage>;

  const buildModule = async (
    role = 'ADMIN',
    userMock = makeUserServiceMock(),
    analyticsMock = makeAnalyticsMock(),
    staffProfileMock = makeStaffProfileMock(),
    categoryMock = makeCategoryRevenueMock(),
    productMock = makeProductServiceMock(),
    metricsMock = makeMetricsMock(),
  ) => {
    await TestBed.configureTestingModule({
      imports: [StaffDashboardPage],
      providers: [
        { provide: AuthService, useValue: makeAuthMock(role) },
        { provide: UserService, useValue: userMock },
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: CategoryRevenueService, useValue: categoryMock },
        { provide: StaffProfileService, useValue: staffProfileMock },
        { provide: ProductService, useValue: productMock },
        { provide: MetricsService, useValue: metricsMock },
      ],
    })
      .overrideComponent(StaffDashboardPage, {
        // Replace the real ChartComponent (needs canvas) with a no-op stub
        remove: { imports: [ChartComponent] },
        add: { imports: [ChartStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(StaffDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const buildModuleSync = (
    role = 'ADMIN',
    userMock = makeUserServiceMock(),
    analyticsMock = makeAnalyticsMock(),
    staffProfileMock = makeStaffProfileMock(),
    categoryMock = makeCategoryRevenueMock(),
    productMock = makeProductServiceMock(),
    metricsMock = makeMetricsMock(),
  ) => {
    TestBed.configureTestingModule({
      imports: [StaffDashboardPage],
      providers: [
        { provide: AuthService, useValue: makeAuthMock(role) },
        { provide: UserService, useValue: userMock },
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: CategoryRevenueService, useValue: categoryMock },
        { provide: StaffProfileService, useValue: staffProfileMock },
        { provide: ProductService, useValue: productMock },
        { provide: MetricsService, useValue: metricsMock },
      ],
    }).overrideComponent(StaffDashboardPage, {
      remove: { imports: [ChartComponent] },
      add: { imports: [ChartStub] },
    });

    fixture = TestBed.createComponent(StaffDashboardPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  it('should create', async () => {
    await buildModule();
    expect(component).toBeTruthy();
  });

  // ── User summary ──────────────────────────────────────────────────────────

  it('should load user summary on init', async () => {
    await buildModule();
    expect(component['userSummary']()?.totalUsers).toBe(10);
    expect(component['userSummary']()?.totalClients).toBe(5);
  });

  it('should set loadingSummary to false after load', async () => {
    await buildModule();
    expect(component['loadingSummary']()).toBe(false);
  });

  it('should call getUserSummary once on init', async () => {
    const userMock = makeUserServiceMock();
    await buildModule('ADMIN', userMock);
    expect(userMock.getUserSummary).toHaveBeenCalledTimes(1);
  });

  // ── Top clients ───────────────────────────────────────────────────────────

  it('should load top clients on init', async () => {
    await buildModule();
    expect(component['topClients']()).toHaveLength(2);
    expect(component['topClients']()[0].name).toBe('Client A');
  });

  it('should set loadingTopClients to false after load', async () => {
    await buildModule();
    expect(component['loadingTopClients']()).toBe(false);
  });

  it('should call getTopClientsBySpend with limit 5', async () => {
    const userMock = makeUserServiceMock();
    await buildModule('ADMIN', userMock);
    expect(userMock.getTopClientsBySpend).toHaveBeenCalledWith(5);
  });

  it('should handle empty top clients list', async () => {
    await buildModule('ADMIN', makeUserServiceMock(mockSummary, []));
    expect(component['topClients']()).toEqual([]);
  });

  // ── Financial metrics via AnalyticsService ────────────────────────────────

  it('should call analytics.getIncome/getExpenses/getProfit for ADMIN', async () => {
    const am = makeAnalyticsMock();
    await buildModule('ADMIN', makeUserServiceMock(), am);
    expect(am.getIncome).toHaveBeenCalledWith('week');
    expect(am.getExpenses).toHaveBeenCalledWith('week');
    expect(am.getProfit).toHaveBeenCalledWith('week');
  });

  it('should call category revenue service for ADMIN', async () => {
    const categoryMock = makeCategoryRevenueMock();
    await buildModule(
      'ADMIN',
      makeUserServiceMock(),
      makeAnalyticsMock(),
      makeStaffProfileMock(),
      categoryMock,
    );
    expect(categoryMock.getRevenueByCategory).toHaveBeenCalledTimes(1);
  });

  it('should NOT call financial methods for non-ADMIN roles', async () => {
    const am = makeAnalyticsMock();
    await buildModule('MANAGER', makeUserServiceMock(), am);
    expect(am.getIncome).not.toHaveBeenCalled();
    expect(am.getExpenses).not.toHaveBeenCalled();
    expect(am.getProfit).not.toHaveBeenCalled();
  });

  it('should set loadingFinancial to false after load', async () => {
    await buildModule();
    expect(component['loadingFinancial']()).toBe(false);
  });

  it('should set loadingCategoryRevenue to false after load', async () => {
    await buildModule();
    expect(component['loadingCategoryRevenue']()).toBe(false);
  });

  it('should populate ADMIN metrics from analytics data', async () => {
    await buildModule();
    const panel = component['panel']();
    expect(panel?.metrics[0].label).toBe('Weekly Revenue');
    expect(panel?.metrics[0].value).toContain('1000');
    expect(panel?.metrics[1].value).toContain('300');
    expect(panel?.metrics[2].value).toContain('700');
  });

  it('should have week as default selected period', async () => {
    await buildModule();
    expect(component['selectedPeriod']()).toBe('week');
  });

  it('should reload analytics when period changes', async () => {
    const am = makeAnalyticsMock();
    await buildModule('ADMIN', makeUserServiceMock(), am);
    (am.getIncome as jest.Mock).mockClear();
    (am.getExpenses as jest.Mock).mockClear();
    (am.getProfit as jest.Mock).mockClear();

    component['setPeriod']('month');

    expect(am.getIncome).toHaveBeenCalledWith('month');
    expect(am.getExpenses).toHaveBeenCalledWith('month');
    expect(am.getProfit).toHaveBeenCalledWith('month');
  });

  it('should update metric labels when period changes', async () => {
    await buildModule();
    component['setPeriod']('year');
    fixture.detectChanges();
    expect(component['panel']()?.metrics[0].label).toContain('Yearly');
  });

  it('categoryRadarChartData should map top categories by revenue', async () => {
    await buildModule();
    const chartData = component['categoryRadarChartData']();

    expect(chartData?.labels).toEqual(['Combustible', 'Cafetería', 'Lubricantes']);
    expect(chartData?.datasets[0].label).toBe('Revenue (€)');
    expect(chartData?.datasets[0].data).toEqual([1250, 430, 210]);
  });

  it('categoryRadarChartData should switch to orders metric', async () => {
    await buildModule();
    component['setCategoryRadarMetric']('orders');

    const chartData = component['categoryRadarChartData']();

    expect(component['categoryRadarTitle']()).toBe('Orders');
    expect(component['categoryRadarSummary']()?.categoryName).toBe('Cafetería');
    expect(chartData?.labels).toEqual(['Cafetería', 'Combustible', 'Lubricantes']);
    expect(chartData?.datasets[0].label).toBe('Orders');
    expect(chartData?.datasets[0].data).toEqual([22, 14, 8]);
  });

  // ── Role panels ───────────────────────────────────────────────────────────

  it('should show ADMIN panel', async () => {
    await buildModule('ADMIN');
    expect(component['panel']()?.badge).toBe('ADMIN');
    expect(component['panel']()?.severity).toBe('danger');
  });

  it('should show MANAGER panel', async () => {
    await buildModule('MANAGER');
    expect(component['panel']()?.badge).toBe('MANAGER');
    expect(component['panel']()?.severity).toBe('warn');
  });

  it('should show EMPLOYEE panel', async () => {
    await buildModule('EMPLOYEE');
    expect(component['panel']()?.badge).toBe('EMPLOYEE');
    expect(component['panel']()?.severity).toBe('info');
  });

  it('should return null panel when no role', async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDashboardPage],
      providers: [
        {
          provide: AuthService,
          useValue: { currentRole: signal(null), currentUser: signal(null) },
        },
        { provide: UserService, useValue: makeUserServiceMock() },
        { provide: AnalyticsService, useValue: makeAnalyticsMock() },
        { provide: StaffProfileService, useValue: makeStaffProfileMock() },
        { provide: ProductService, useValue: makeProductServiceMock() },
        { provide: MetricsService, useValue: makeMetricsMock() },
      ],
    })
      .overrideComponent(StaffDashboardPage, {
        remove: { imports: [ChartComponent] },
        add: { imports: [ChartStub] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(StaffDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component['panel']()).toBeNull();
  });

  // ── Staff profile ─────────────────────────────────────────────────────────

  it('should load staff profile for MANAGER', async () => {
    const sm = makeStaffProfileMock();
    await buildModule('MANAGER', makeUserServiceMock(), makeAnalyticsMock(), sm);
    expect(sm.getStaffProfile).toHaveBeenCalledWith(1);
    expect(component['staffProfile']()).toEqual(mockStaffProfile);
  });

  it('should load staff profile for EMPLOYEE', async () => {
    const sm = makeStaffProfileMock();
    await buildModule('EMPLOYEE', makeUserServiceMock(), makeAnalyticsMock(), sm);
    expect(sm.getStaffProfile).toHaveBeenCalledWith(1);
  });

  it('should NOT load staff profile for ADMIN', async () => {
    const sm = makeStaffProfileMock();
    await buildModule('ADMIN', makeUserServiceMock(), makeAnalyticsMock(), sm);
    expect(sm.getStaffProfile).not.toHaveBeenCalled();
  });

  it('should populate MANAGER metrics from staff profile', async () => {
    await buildModule('MANAGER');
    fixture.detectChanges();
    const panel = component['panel']();
    expect(panel?.metrics[0].label).toBe('Salary');
    expect(panel?.metrics[0].value).toContain('5000');
    expect(panel?.metrics[2].label).toBe('Duration');
    expect(panel?.metrics[2].value).toContain('8');
    expect(panel?.metrics[2].value).toContain('h');
    // Duration is at index 2 now because I removed some or reorganized? 
    // Let's check the code: 0: Salario, 1: Turno, 2: Duración. 
    // Yes.
    expect(panel?.metrics[1].value).toBe('09:00 - 17:00');
  });

  it('should set loadingStaffProfile to false after load', async () => {
    await buildModule('MANAGER');
    expect(component['loadingStaffProfile']()).toBe(false);
  });

  // ── Shift duration ────────────────────────────────────────────────────────

  it('should calculate shift duration correctly', async () => {
    await buildModule();
    expect(component['calculateShiftDuration']('09:00', '17:00')).toBe(8);
  });

  it('should calculate shift duration with minutes', async () => {
    await buildModule();
    expect(component['calculateShiftDuration']('09:30', '17:45')).toBe(8.3);
  });

  it('should return 0 for invalid time format', async () => {
    await buildModule();
    expect(component['calculateShiftDuration']('invalid', 'time')).toBe(0);
  });

  // ── Product evolution ─────────────────────────────────────────────────────

  it('should load product evolution on init', async () => {
    const am = makeAnalyticsMock();
    await buildModule('ADMIN', makeUserServiceMock(), am);
    expect(am.getProductEvolution).toHaveBeenCalledWith({
      scope: 'week',
      productName: '',
      categoryName: '',
    });
  });

  it('should set productChartData after load', async () => {
    await buildModule();
    expect(component['productChartData']()).not.toBeNull();
    expect(component['productChartData']()?.datasets.length).toBeGreaterThan(0);
  });

  it('setProductPeriod — should update period and reload', async () => {
    const am = makeAnalyticsMock();
    await buildModule('ADMIN', makeUserServiceMock(), am);
    component['setProductPeriod']('month');
    expect(component['productChartPeriod']()).toBe('month');
    expect(am.getProductEvolution).toHaveBeenCalledWith({
      scope: 'month',
      productName: '',
      categoryName: '',
    });
  });

  it('setProductPeriod — should include current search term', async () => {
    const am = makeAnalyticsMock();
    await buildModule('ADMIN', makeUserServiceMock(), am);
    component['productSearchInput'].set('Diesel');
    component['setProductPeriod']('year');
    expect(am.getProductEvolution).toHaveBeenCalledWith({
      scope: 'year',
      productName: 'Diesel',
      categoryName: '',
    });
  });

  it('clearProductSearch — should reset input to empty string', async () => {
    await buildModule();
    component['productSearchInput'].set('Diesel');
    component['clearProductSearch']();
    expect(component['productSearchInput']()).toBe('');
  });

  it('loadingProductChart — should be false after successful load', async () => {
    await buildModule();
    expect(component['loadingProductChart']()).toBe(false);
  });

  it('loadingProductChart — should be false after error', async () => {
    const am: Partial<AnalyticsService> = {
      ...makeAnalyticsMock(),
      getProductEvolution: jest.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };
    await buildModule('ADMIN', makeUserServiceMock(), am);
    expect(component['loadingProductChart']()).toBe(false);
  });

  it('productChartData — should remain null on error', async () => {
    const am: Partial<AnalyticsService> = {
      ...makeAnalyticsMock(),
      getProductEvolution: jest.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };
    await buildModule('ADMIN', makeUserServiceMock(), am);
    expect(component['productChartData']()).toBeNull();
  });

  it('debounced search — should call getProductEvolution after 350ms', fakeAsync(() => {
    const am = makeAnalyticsMock();

    buildModuleSync('ADMIN', makeUserServiceMock(), am);

    tick();

    (am.getProductEvolution as jest.Mock).mockClear();

    component['onProductSearchChange']('Gas');

    tick(349);

    expect(am.getProductEvolution).not.toHaveBeenCalled();

    tick(1);

    expect(am.getProductEvolution).toHaveBeenCalledTimes(1);

    expect(am.getProductEvolution).toHaveBeenCalledWith({
      scope: 'week',
      productName: 'Gas',
      categoryName: '',
    });
  }));

  it('debounced search — rapid inputs should fire only once', fakeAsync(() => {
    const am = makeAnalyticsMock();

    buildModuleSync('ADMIN', makeUserServiceMock(), am);

    tick();

    (am.getProductEvolution as jest.Mock).mockClear();

    component['onProductSearchChange']('G');

    tick(100);

    component['onProductSearchChange']('Ga');

    tick(100);

    component['onProductSearchChange']('Gas');

    tick(349);

    expect(am.getProductEvolution).not.toHaveBeenCalled();

    tick(1);

    expect(am.getProductEvolution).toHaveBeenCalledTimes(1);

    expect(am.getProductEvolution).toHaveBeenCalledWith({
      scope: 'week',
      productName: 'Gas',
      categoryName: '',
    });
  }));
});
