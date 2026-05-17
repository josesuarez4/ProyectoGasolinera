import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ChangeDetectorRef,
  computed,
  PLATFORM_ID,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleCasePipe, isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TagModule } from 'primeng/tag';
import { AppRole, AuthService } from '../../../services/auth/auth.service';
import { TopClientRecord, UserService, UserSummary } from '../../../services/users/user.service';
import { Card } from '../../../components/card/card';
import { ChartComponent } from '../../../components/chart/chart.component';
import {
  CategoryRevenueDTO,
  CategoryRevenueService,
} from '../../../services/category-revenue/category-revenue';
import {
  StaffProfile,
  StaffProfileService,
} from '../../../services/staff-profile/staff-profile.service';
import {
  AnalyticsService,
  FinancialMetricResponse,
  FinancialScope,
  ProductSalesPoint,
} from '../../../services/analytics/analytics.service';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { ProductService, Category } from '../../../services/products/product.service';

// ── Interfaces & Types ──────────────────────────────────────────────────────

interface RoleMetric {
  label: string;
  value: string;
  icon?: string;
}

interface RolePanel {
  title: string;
  subtitle: string;
  badge: string;
  severity: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';
  metrics: RoleMetric[];
}

interface ProductChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill: boolean;
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
}

interface RadarDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointHoverBackgroundColor: string;
  pointHoverBorderColor: string;
  fill: boolean;
}

interface RadarChartData {
  labels: string[];
  datasets: RadarDataset[];
}

type CategoryRadarMetric = 'revenue' | 'orders';

interface CategoryRadarSummary {
  categoryName: string;
  totalRevenue: number;
  orderCount: number;
}

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [Card, ChartComponent, TagModule, TitleCasePipe, FormsModule, CommonModule],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDashboardPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly analytics = inject(AnalyticsService);
  private readonly metricsService = inject(MetricsService);
  private readonly categoryRevenueService = inject(CategoryRevenueService);
  private readonly staffProfileService = inject(StaffProfileService);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── User summary & top clients ────────────────────────────────────────────
  protected readonly userSummary = signal<UserSummary | null>(null);
  protected readonly topClients = signal<TopClientRecord[]>([]);
  protected readonly loadingSummary = signal(true);
  protected readonly loadingTopClients = signal(true);

  // ── Financial metrics ─────────────────────────────────────────────────────
  protected readonly loadingFinancial = signal(true);
  protected readonly selectedPeriod = signal<FinancialScope>('week');
  protected readonly availablePeriods: FinancialScope[] = ['day', 'week', 'month', 'year'];

  protected readonly currentIncome = signal<FinancialMetricResponse | null>(null);
  protected readonly currentExpenses = signal<FinancialMetricResponse | null>(null);
  protected readonly currentProfit = signal<FinancialMetricResponse | null>(null);

  protected readonly financialChartData = computed(() => {
    const income = this.currentIncome();
    const expenses = this.currentExpenses();
    const profit = this.currentProfit();
    if (!income || !expenses || !profit) return null;
    return {
      labels: ['Current Period'],
      datasets: [
        { label: 'Revenue', data: [income.amount], backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Expenses', data: [expenses.amount], backgroundColor: '#ef4444', borderRadius: 6 },
        { label: 'Profit', data: [profit.amount], backgroundColor: '#6366f1', borderRadius: 6 },
      ],
    };
  });

  // ── Category revenue radar ──────────────────────────────────────────────
  protected readonly loadingCategoryRevenue = signal(true);
  protected readonly categoryRevenue = signal<CategoryRevenueDTO[]>([]);
  protected readonly categoryRadarMetric = signal<CategoryRadarMetric>('revenue');

  protected readonly categoryRadarSummary = computed<CategoryRadarSummary | null>(() => {
    const categories = this.getCategoryRadarCategories();
    return categories[0] ?? null;
  });

  protected readonly categoryRadarTitle = computed(() => {
    return this.categoryRadarMetric() === 'revenue' ? 'Revenue Focus' : 'Orders';
  });

  protected readonly categoryRadarChartData = computed<RadarChartData | null>(() => {
    const metric = this.categoryRadarMetric();
    const topCategories = this.getCategoryRadarCategories(metric);
    if (topCategories.length === 0) return null;

    return {
      labels: topCategories.map((c) => c.categoryName),
      datasets: [
        {
          label: metric === 'revenue' ? 'Revenue (€)' : 'Orders',
          data: topCategories.map((c) => (metric === 'revenue' ? c.totalRevenue : c.orderCount)),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.18)',
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#6366f1',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#6366f1',
          fill: true,
        },
      ],
    };
  });

  protected readonly categoryRadarOptions = {
    scales: {
      r: {
        beginAtZero: true,
      },
    },
  };

  // ── Extra Analytics (The 6 Operational Charts) ────────────────────────────
  protected readonly loadingExtraCharts = signal(true);
  protected readonly lowStockCount = signal<number>(0);
  protected readonly orderStatusData = signal<any>(null);
  protected readonly topProductsData = signal<any>(null);
  protected readonly stockData = signal<any>(null);
  protected readonly topEmployeesData = signal<any>(null);
  protected readonly hourlySalesData = signal<any>(null);
  protected readonly originSalesData = signal<any>(null);

  protected readonly polarAreaOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: { enabled: true },
    },
    scales: { r: { pointLabels: { display: false }, ticks: { display: false } } },
  };

  protected readonly defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' } },
  };

  protected readonly barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
  };

  // ── Product evolution ─────────────────────────────────────────────────────
  protected readonly productChartData = signal<ProductChartData | null>(null);
  protected readonly loadingProductChart = signal(false);
  protected readonly productSearchInput = signal('');
  protected readonly productChartPeriod = signal<FinancialScope>('week');
  protected readonly productChartCategory = signal<string>('');
  protected readonly productChartStartDate = signal<string>('');
  protected readonly productChartEndDate = signal<string>('');
  protected readonly categories = signal<Category[]>([]);
  private readonly productSearch$ = new Subject<string>();

  // ── Staff profile ─────────────────────────────────────────────────────────
  protected readonly staffProfile = signal<StaffProfile | null>(null);
  protected readonly loadingStaffProfile = signal(true);

  constructor() {}

  ngOnInit() {
    this.loadUserSummary();
    this.loadTopClients();
    this.loadFinancialMetrics();
    this.loadCategoryRevenue();
    this.loadStaffProfile();
    this.loadExtraMetrics();
    this.loadCategories();
    this.loadProductEvolution('', 'week', '');
    this.setupProductSearchDebounce();
  }

  // ── Role panel logic ──
  protected readonly currentRole = computed(() => this.auth.currentRole());

  private readonly dashboardByRole: Record<AppRole, RolePanel> = {
    ADMIN: {
      title: 'Admin Dashboard',
      subtitle: 'Global visibility and governance controls.',
      badge: 'ADMIN',
      severity: 'danger',
      metrics: [],
    },
    MANAGER: {
      title: 'Manager Dashboard',
      subtitle: 'Team operations and performance.',
      badge: 'MANAGER',
      severity: 'warn',
      metrics: [],
    },
    EMPLOYEE: {
      title: 'Employee Dashboard',
      subtitle: 'Daily workload and tasks.',
      badge: 'EMPLOYEE',
      severity: 'info',
      metrics: [],
    },
    CLIENT: {
      title: 'Staff Dashboard',
      subtitle: 'Access restricted.',
      badge: 'LOCKED',
      severity: 'secondary',
      metrics: [],
    },
  };

  protected readonly panel = computed<RolePanel | null>(() => {
    const role = this.currentRole();
    if (!role) return null;

    const base = { ...this.dashboardByRole[role], metrics: [] as RoleMetric[] };
    const staffProfile = this.staffProfile();

    if (role === 'ADMIN') {
      const income = this.currentIncome();
      const expenses = this.currentExpenses();
      const profit = this.currentProfit();
      const stock = this.stockData();
      const lowStock = this.lowStockCount();
      const totalProducts = stock?.labels?.length ?? '...';
      const loading = this.loadingFinancial();

      const periodLabels: Record<FinancialScope, string> = {
        day: 'Daily',
        week: 'Weekly',
        month: 'Monthly',
        year: 'Yearly',
      };
      const labelSuffix = periodLabels[this.selectedPeriod()];

      return {
        ...base,
        metrics: [
          {
            label: `${labelSuffix} Revenue`,
            value: income ? `${income.amount.toFixed(2)} €` : loading ? '...' : '0.00 €',
            icon: 'pi-money-bill',
          },
          {
            label: `${labelSuffix} Expenses`,
            value: expenses ? `${expenses.amount.toFixed(2)} €` : loading ? '...' : '0.00 €',
            icon: 'pi-shopping-cart',
          },
          {
            label: `${labelSuffix} Profit`,
            value: profit ? `${profit.amount.toFixed(2)} €` : loading ? '...' : '0.00 €',
            icon: 'pi-chart-line',
          },
          { label: 'Total Products', value: `${totalProducts}`, icon: 'pi-box' },
          { label: 'Low Stock Alerts', value: `${lowStock}`, icon: 'pi-exclamation-triangle' },
        ],
      };
    }

    if ((role === 'MANAGER' || role === 'EMPLOYEE') && staffProfile) {
      return {
        ...base,
        metrics: [
          { label: 'Salary', value: `${staffProfile.salary.toFixed(2)} €`, icon: 'pi-wallet' },
          {
            label: 'Shift',
            value: `${staffProfile.startTime} - ${staffProfile.endTime}`,
            icon: 'pi-calendar',
          },
          {
            label: 'Duration',
            value: `${this.calculateShiftDuration(staffProfile.startTime, staffProfile.endTime)}h`,
            icon: 'pi-clock',
          },
        ],
      };
    }

    return base;
  });

  // ── Financial period logic ──
  protected setPeriod(period: FinancialScope): void {
    this.selectedPeriod.set(period);
    this.loadFinancialMetrics();
  }

  // ── Product evolution logic ──
  protected setProductPeriod(period: FinancialScope): void {
    this.productChartPeriod.set(period);
    this.loadProductEvolution(this.productSearchInput(), period, this.productChartCategory());
  }

  protected setProductCategory(categoryName: string): void {
    this.productChartCategory.set(categoryName);
    this.loadProductEvolution(this.productSearchInput(), this.productChartPeriod(), categoryName, this.productChartStartDate(), this.productChartEndDate());
  }

  protected setProductStartDate(date: string): void {
    this.productChartStartDate.set(date);
    this.loadProductEvolution(this.productSearchInput(), this.productChartPeriod(), this.productChartCategory(), date, this.productChartEndDate());
  }

  protected setProductEndDate(date: string): void {
    this.productChartEndDate.set(date);
    this.loadProductEvolution(this.productSearchInput(), this.productChartPeriod(), this.productChartCategory(), this.productChartStartDate(), date);
  }

  protected onProductSearchChange(value: string): void {
    this.productSearchInput.set(value);
    this.productSearch$.next(value);
  }

  protected onSearchEnter(): void {
    this.loadProductEvolution(
      this.productSearchInput(),
      this.productChartPeriod(),
      this.productChartCategory(),
      this.productChartStartDate(),
      this.productChartEndDate()
    );
  }

  protected clearProductSearch(): void {
    this.productSearchInput.set('');
    this.productSearch$.next('');
  }

  private setupProductSearchDebounce(): void {
    this.productSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term: string) => {
          this.loadingProductChart.set(true);
          return this.analytics.getProductEvolution({
            period: this.productChartPeriod(),
            productName: term,
            categoryName: this.productChartCategory(),
            startDate: this.productChartStartDate() || undefined,
            endDate: this.productChartEndDate() || undefined
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (points) => {
          this.productChartData.set(this.toEvolutionChartData(points));
          this.loadingProductChart.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingProductChart.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private loadProductEvolution(
    productName: string,
    period: FinancialScope,
    categoryName: string = '',
    startDate: string = '',
    endDate: string = ''
  ): void {
    this.loadingProductChart.set(true);
    this.analytics
      .getProductEvolution({ 
        period, 
        productName, 
        categoryName, 
        startDate: startDate || undefined, 
        endDate: endDate || undefined 
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (points) => {
          this.productChartData.set(this.toEvolutionChartData(points));
          this.loadingProductChart.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingProductChart.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private loadCategories(): void {
    this.productService
      .getAllCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => {
        this.categories.set(cats);
        this.cdr.markForCheck();
      });
  }

  private toEvolutionChartData(points: ProductSalesPoint[]): ProductChartData {
    if (!points.length) return { labels: [], datasets: [] };
    const labels = [...new Set(points.map((p) => p.date))].sort((a, b) => a.localeCompare(b));
    const byProduct = new Map<string, Map<string, number>>();
    for (const p of points) {
      if (!byProduct.has(p.product)) byProduct.set(p.product, new Map());
      byProduct.get(p.product)!.set(p.date, p.unitsSold);
    }
    const colors = [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#3b82f6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
    ];
    const datasets = [...byProduct.entries()].map(([name, dateMap], i) => {
      const color = colors[i % colors.length];
      return {
        label: name,
        data: labels.map((d) => dateMap.get(d) ?? 0),
        borderColor: color,
        backgroundColor: color + '22',
        tension: 0.35,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
      };
    });
    return { labels, datasets };
  }

  // ── Data loaders ──

  private loadUserSummary(): void {
    this.userService
      .getUserSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((summary) => {
        this.userSummary.set(summary);
        this.loadingSummary.set(false);
        this.cdr.markForCheck();
      });
  }

  private loadTopClients(): void {
    this.userService
      .getTopClientsBySpend(5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clients) => {
        this.topClients.set(clients);
        this.loadingTopClients.set(false);
        this.cdr.markForCheck();
      });
  }

  private loadFinancialMetrics(): void {
    if (this.currentRole() !== 'ADMIN') {
      this.loadingFinancial.set(false);
      return;
    }
    this.loadingFinancial.set(true);
    const period = this.selectedPeriod();

    forkJoin({
      income: this.analytics.getIncome(period).pipe(catchError(() => of(null))),
      expenses: this.analytics.getExpenses(period).pipe(catchError(() => of(null))),
      profit: this.analytics.getProfit(period).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res.income) this.currentIncome.set(res.income);
        if (res.expenses) this.currentExpenses.set(res.expenses);
        if (res.profit) this.currentProfit.set(res.profit);

        this.loadingFinancial.set(false);
        this.cdr.markForCheck();
      });
  }

  private loadCategoryRevenue(): void {
    if (this.currentRole() !== 'ADMIN') {
      this.loadingCategoryRevenue.set(false);
      return;
    }
    this.loadingCategoryRevenue.set(true);
    this.categoryRevenueService
      .getRevenueByCategory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoryRevenue.set(categories);
          this.loadingCategoryRevenue.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.categoryRevenue.set([]);
          this.loadingCategoryRevenue.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  protected setCategoryRadarMetric(metric: CategoryRadarMetric): void {
    this.categoryRadarMetric.set(metric);
  }

  private getCategoryRadarCategories(
    metric: CategoryRadarMetric = this.categoryRadarMetric(),
  ): CategoryRevenueDTO[] {
    return [...this.categoryRevenue()]
      .sort((a, b) =>
        metric === 'revenue' ? b.totalRevenue - a.totalRevenue : b.orderCount - a.orderCount,
      )
      .slice(0, 6);
  }


  private loadStaffProfile(): void {
    const user = this.auth.currentUser();
    const role = this.auth.currentRole();
    if (!user?.id || (role !== 'MANAGER' && role !== 'EMPLOYEE')) {
      this.loadingStaffProfile.set(false);
      return;
    }
    this.staffProfileService
      .getStaffProfile(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.staffProfile.set(p);
          this.loadingStaffProfile.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingStaffProfile.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private loadExtraMetrics(): void {
    this.loadingExtraCharts.set(true);
    forkJoin({
      orders: this.metricsService.getOrdersByStatus().pipe(catchError(() => of([]))),
      products: this.metricsService.getTopProducts(5).pipe(catchError(() => of([]))),
      stock: this.metricsService.getProductStock().pipe(catchError(() => of([]))),
      origin: this.metricsService.getSalesByOrigin().pipe(catchError(() => of([]))),
      topEmps: this.metricsService.getTopEmployeesBySales().pipe(catchError(() => of([]))),
      hourly: this.metricsService.getHourlySales().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const lowStock = res.stock.filter((s: any) => (s.currentStock ?? s.stock ?? 0) < 10).length;
        this.lowStockCount.set(lowStock);

        setTimeout(() => {
          const labelMap: any = {
            PENDING: 'Pending',
            PICKED_UP: 'Picked Up',
            CANCELLED: 'Cancelled',
          };
          this.orderStatusData.set({
            labels: res.orders.map((d: any) => labelMap[d.status] || d.status),
            datasets: [
              {
                data: res.orders.map((d: any) => d.count),
                backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
              },
            ],
          });

          this.topProductsData.set({
            labels: res.products.map((p: any) => p.productName),
            datasets: [
              {
                data: res.products.map((p: any) => p.totalRevenue),
                backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'],
              },
            ],
          });

          this.stockData.set({
            labels: res.stock.map((s: any) => s.productName || s.name),
            datasets: [
              {
                label: 'Stock',
                data: res.stock.map((s: any) => s.currentStock ?? s.stock ?? 0),
                backgroundColor: '#6366f1',
                borderRadius: 4,
              },
            ],
          });

          this.topEmployeesData.set({
            labels: res.topEmps.map((e: any) => e.employeeName),
            datasets: [
              {
                label: 'Tickets',
                data: res.topEmps.map((e: any) => e.ticketCount),
                backgroundColor: '#6366f1',
                borderRadius: 4,
              },
            ],
          });

          this.originSalesData.set({
            labels: res.origin.map((o: any) => (o.isOnline ? 'Online' : 'In-Store')),
            datasets: [
              {
                data: res.origin.map((o: any) => o.totalRevenue),
                backgroundColor: ['#6366f1', '#f59e0b'],
              },
            ],
          });

          this.hourlySalesData.set({
            labels: res.hourly.map((h: any) => `${h.hour}:00`),
            datasets: [
              {
                label: 'Sales',
                data: res.hourly.map((h: any) => h.ticketCount),
                backgroundColor: '#10b981',
                borderRadius: 4,
              },
            ],
          });

          this.loadingExtraCharts.set(false);
          this.cdr.markForCheck();
        }, 0);
      });
  }

  private calculateShiftDuration(start: string, end: string): number {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
      return Math.round((eh + em / 60 - (sh + sm / 60)) * 10) / 10;
    } catch {
      return 0;
    }
  }
}
