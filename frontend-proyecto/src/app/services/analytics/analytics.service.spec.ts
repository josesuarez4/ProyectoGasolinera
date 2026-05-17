import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { 
  AnalyticsService,
  FinancialMetricResponse,
  ProductAnalyticsRecord,
  ProductSalesPoint, 
} from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let http: HttpTestingController;

  const BASE      = 'http://localhost:8080';
  const FINANCIAL = `${BASE}/reports/financial`;
  const PRODUCTS  = `${BASE}/reports/products`;
  const EVOLUTION = `${BASE}/metrics/tickets`;

  // ── Shared mock responses ─────────────────────────────────────────────────

  const mockIncome: FinancialMetricResponse = {
    metric: 'income', scope: 'week',
    from: '2026-04-28T00:00:00', to: '2026-05-07T14:00:00', amount: 1500,
  };
  const mockExpenses: FinancialMetricResponse = {
    metric: 'expenses', scope: 'week',
    from: '2026-04-28T00:00:00', to: '2026-05-07T14:00:00', amount: 400,
  };
  const mockProfit: FinancialMetricResponse = {
    metric: 'profit', scope: 'week',
    from: '2026-04-28T00:00:00', to: '2026-05-07T14:00:00', amount: 1100,
  };

  const mockProducts: ProductAnalyticsRecord[] = [
    {
      id: 1, name: 'Diesel', categoryName: 'Fuel',
      currentStock: 500, currentPrice: 1.65,
      monthlySalesCount: 120, monthlyRevenue: 198,
      lastSupplierName: 'Repsol', lastCostPrice: 1.4,
    },
    {
      id: 2, name: 'Gasolina 95', categoryName: 'Fuel',
      currentStock: 300, currentPrice: 1.75,
      monthlySalesCount: 80, monthlyRevenue: 140,
      lastSupplierName: null, lastCostPrice: null,
    },
  ];

  const mockEvolution: ProductSalesPoint[] = [
    { date: '2026-05-01', product: 'Diesel',      unitsSold: 40, revenue: 80 },
    { date: '2026-05-02', product: 'Diesel',      unitsSold: 55, revenue: 110 },
    { date: '2026-05-01', product: 'Gasolina 95', unitsSold: 30, revenue: 60 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AnalyticsService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── getIncome ─────────────────────────────────────────────────────────────

  it('getIncome — should call GET /reports/financial/income with scope param', () => {
    service.getIncome('week').subscribe();

    const req = http.expectOne(r =>
      r.url === `${FINANCIAL}/income` && r.params.get('scope') === 'week'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockIncome);
  });

  it('getIncome — should return the mapped FinancialMetricResponse', () => {
    let result: FinancialMetricResponse | undefined;
    service.getIncome('week').subscribe(r => (result = r));

    http.expectOne(() => true).flush(mockIncome);
    expect(result?.metric).toBe('income');
    expect(result?.amount).toBe(1500);
    expect(result?.scope).toBe('week');
  });

  it('getIncome — should support all scope values', () => {
    const scopes = ['day', 'week', 'month', 'year'] as const;
    scopes.forEach(scope => {
      service.getIncome(scope).subscribe();
      const req = http.expectOne(r => r.params.get('scope') === scope);
      req.flush({ ...mockIncome, scope });
    });
  });

  // ── getExpenses ───────────────────────────────────────────────────────────

  it('getExpenses — should call GET /reports/financial/expenses with scope param', () => {
    service.getExpenses('month').subscribe();

    const req = http.expectOne(r =>
      r.url === `${FINANCIAL}/expenses` && r.params.get('scope') === 'month'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockExpenses);
  });

  it('getExpenses — should return the mapped FinancialMetricResponse', () => {
    let result: FinancialMetricResponse | undefined;
    service.getExpenses('month').subscribe(r => (result = r));

    http.expectOne(() => true).flush(mockExpenses);
    expect(result?.metric).toBe('expenses');
    expect(result?.amount).toBe(400);
  });

  // ── getProfit ─────────────────────────────────────────────────────────────

  it('getProfit — should call GET /reports/financial/profit with scope param', () => {
    service.getProfit('year').subscribe();

    const req = http.expectOne(r =>
      r.url === `${FINANCIAL}/profit` && r.params.get('scope') === 'year'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProfit);
  });

  it('getProfit — should return the mapped FinancialMetricResponse', () => {
    let result: FinancialMetricResponse | undefined;
    service.getProfit('year').subscribe(r => (result = r));

    http.expectOne(() => true).flush(mockProfit);
    expect(result?.metric).toBe('profit');
    expect(result?.amount).toBe(1100);
  });

  // ── getProductAnalytics ───────────────────────────────────────────────────

  it('getProductAnalytics — should call GET /reports/products/analytics', () => {
    service.getProductAnalytics().subscribe();

    const req = http.expectOne(r => r.url === `${PRODUCTS}/analytics`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
  });

  it('getProductAnalytics — should send name filter when provided', () => {
    service.getProductAnalytics({ name: 'Diesel' }).subscribe();

    const req = http.expectOne(r => r.params.get('name') === 'Diesel');
    req.flush([]);
  });

  it('getProductAnalytics — should send category filter when provided', () => {
    service.getProductAnalytics({ category: 'Fuel' }).subscribe();

    const req = http.expectOne(r => r.params.get('category') === 'Fuel');
    req.flush([]);
  });

  it('getProductAnalytics — should send pagination params', () => {
    service.getProductAnalytics({ page: 2, size: 10 }).subscribe();

    const req = http.expectOne(r =>
      r.params.get('page') === '2' && r.params.get('size') === '10'
    );
    req.flush([]);
  });

  it('getProductAnalytics — should send sort param', () => {
    service.getProductAnalytics({ sort: 'monthlyRevenue,desc' }).subscribe();

    const req = http.expectOne(r => r.params.get('sort') === 'monthlyRevenue,desc');
    req.flush([]);
  });

  it('getProductAnalytics — should not send name param when empty string', () => {
    service.getProductAnalytics({ name: '' }).subscribe();

    const req = http.expectOne(r => r.url === `${PRODUCTS}/analytics`);
    expect(req.request.params.has('name')).toBe(false);
    req.flush([]);
  });

  it('getProductAnalytics — should not send category param when empty string', () => {
    service.getProductAnalytics({ category: '   ' }).subscribe();

    const req = http.expectOne(r => r.url === `${PRODUCTS}/analytics`);
    expect(req.request.params.has('category')).toBe(false);
    req.flush([]);
  });

  it('getProductAnalytics — should return list of ProductAnalyticsRecord', () => {
    let result: ProductAnalyticsRecord[] = [];
    service.getProductAnalytics().subscribe(r => (result = r));

    http.expectOne(() => true).flush(mockProducts);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Diesel');
    expect(result[0].monthlySalesCount).toBe(120);
    expect(result[1].lastSupplierName).toBeNull();
  });

  it('getProductAnalytics — should handle empty list response', () => {
    let result: ProductAnalyticsRecord[] = [{ id: 1 } as any];
    service.getProductAnalytics().subscribe(r => (result = r));

    http.expectOne(() => true).flush([]);
    expect(result).toEqual([]);
  });

  it('getProductAnalytics — no params should produce clean URL with no query string', () => {
    service.getProductAnalytics({}).subscribe();

    const req = http.expectOne(r => r.url === `${PRODUCTS}/analytics`);
    // No filters → no extra params beyond the URL itself
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  // ── getProductEvolution ───────────────────────────────────────────────────

  it('getProductEvolution — should call GET /metrics/tickets/evolution', () => {
    service.getProductEvolution({ period: 'week' }).subscribe();

    const req = http.expectOne(r => r.url === `${EVOLUTION}/evolution`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getProductEvolution — should send period and productName params', () => {
    service.getProductEvolution({ period: 'month', productName: 'Diesel' }).subscribe();

    const req = http.expectOne(r =>
      r.params.get('period') === 'month' && r.params.get('productName') === 'Diesel'
    );
    req.flush([]);
  });

  it('getProductEvolution — should send empty productName when not provided', () => {
    service.getProductEvolution({ period: 'week' }).subscribe();

    const req = http.expectOne(() => true);
    expect(req.request.params.get('productName')).toBe('');
    req.flush([]);
  });

  it('getProductEvolution — should send empty productName when explicitly empty', () => {
    service.getProductEvolution({ period: 'week', productName: '' }).subscribe();

    const req = http.expectOne(() => true);
    expect(req.request.params.get('productName')).toBe('');
    req.flush([]);
  });

  it('getProductEvolution — should return list of ProductSalesPoint', () => {
    let result: ProductSalesPoint[] = [];
    service.getProductEvolution({ period: 'week', productName: '' }).subscribe(r => (result = r));

    http.expectOne(() => true).flush(mockEvolution);
    expect(result).toHaveLength(3);
    expect(result[0].product).toBe('Diesel');
    expect(result[0].unitsSold).toBe(40);
  });

  it('getProductEvolution — should support all scope values', () => {
    const scopes = ['day', 'week', 'month', 'year'] as const;
    scopes.forEach(period => {
      service.getProductEvolution({ period }).subscribe();
      const req = http.expectOne(r => r.params.get('period') === period);
      req.flush([]);
    });
  });

  it('getProductEvolution — should return empty list when no data', () => {
    let result: ProductSalesPoint[] = [{ date: 'x' } as any];
    service.getProductEvolution({ scope: 'day', productName: 'xyz' }).subscribe(r => (result = r));

    http.expectOne(() => true).flush([]);
    expect(result).toEqual([]);
  });
});