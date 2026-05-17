import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  ProductEvolutionService,
  ProductSalesPoint,
  ProductChartData,
} from './product-evolution.service';

describe('ProductEvolutionService', () => {
  let service: ProductEvolutionService;
  let http: HttpTestingController;

  const BASE_URL = 'http://localhost:8080/metrics/tickets/evolution';

  const mockPoints: ProductSalesPoint[] = [
    { date: '2026-05-01', product: 'Diesel',      unitsSold: 40, revenue: 80 },
    { date: '2026-05-02', product: 'Diesel',      unitsSold: 55, revenue: 110 },
    { date: '2026-05-01', product: 'Gasolina 95', unitsSold: 30, revenue: 60 },
    { date: '2026-05-02', product: 'Gasolina 95', unitsSold: 20, revenue: 40 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductEvolutionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProductEvolutionService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── getChartData ──────────────────────────────────────────────────────────

  it('should call the correct URL with scope and productName params', () => {
    service.getChartData('week', 'Diesel').subscribe();

    const req = http.expectOne(r =>
      r.url === BASE_URL &&
      r.params.get('period') === 'week' &&
      r.params.get('productName') === 'Diesel'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should pass empty productName when fetching all products', () => {
    service.getChartData('month', '').subscribe();

    const req = http.expectOne(r => r.params.get('productName') === '');
    req.flush([]);
    expect(req).toBeTruthy();
  });

  it('should return the raw array from the backend', () => {
    let result: ProductSalesPoint[] = [];
    service.getChartData('week', '').subscribe(data => (result = data));

    http.expectOne(() => true).flush(mockPoints);
    expect(result).toHaveLength(4);
    expect(result[0].product).toBe('Diesel');
  });

  it('should support all scope values as query params', () => {
    const scopes = ['day', 'week', 'month', 'year'];
    scopes.forEach(scope => {
      service.getChartData(scope, '').subscribe();
      const req = http.expectOne(r => r.params.get('period') === scope);
      req.flush([]);
    });
  });

  // ── toChartData ───────────────────────────────────────────────────────────

  it('should return empty labels and datasets for empty input', () => {
    const result = service.toChartData([]);
    expect(result.labels).toEqual([]);
    expect(result.datasets).toEqual([]);
  });

  it('should produce one dataset per unique product', () => {
    const result = service.toChartData(mockPoints);
    expect(result.datasets).toHaveLength(2);
    expect(result.datasets.map(d => d.label)).toContain('Diesel');
    expect(result.datasets.map(d => d.label)).toContain('Gasolina 95');
  });

  it('should produce sorted unique date labels', () => {
    const result = service.toChartData(mockPoints);
    expect(result.labels).toEqual(['2026-05-01', '2026-05-02']);
  });

  it('should map correct units to each label for a product', () => {
    const result = service.toChartData(mockPoints);
    const diesel = result.datasets.find(d => d.label === 'Diesel')!;
    expect(diesel.data).toEqual([40, 55]); // 01 → 40, 02 → 55
  });

  it('should fill missing dates with 0', () => {
    const sparse: ProductSalesPoint[] = [
      { date: '2026-05-01', product: 'Diesel',      unitsSold: 40, revenue: 80 },
      { date: '2026-05-02', product: 'Gasolina 95', unitsSold: 20, revenue: 40 },
    ];
    const result = service.toChartData(sparse);
    const diesel    = result.datasets.find(d => d.label === 'Diesel')!;
    const gasolina  = result.datasets.find(d => d.label === 'Gasolina 95')!;
    // Diesel has no data for 02 → 0
    expect(diesel.data).toEqual([40, 0]);
    // Gasolina 95 has no data for 01 → 0
    expect(gasolina.data).toEqual([0, 20]);
  });

  it('should assign a borderColor to each dataset', () => {
    const result = service.toChartData(mockPoints);
    result.datasets.forEach(ds => {
      expect(ds.borderColor).toBeTruthy();
      expect(ds.borderColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('should set tension to 0.35 on all datasets', () => {
    const result = service.toChartData(mockPoints);
    result.datasets.forEach(ds => expect(ds.tension).toBe(0.35));
  });

  it('should set fill to false on all datasets', () => {
    const result = service.toChartData(mockPoints);
    result.datasets.forEach(ds => expect(ds.fill).toBe(false));
  });

  it('should cycle through palette for more than 8 products', () => {
    const manyPoints: ProductSalesPoint[] = Array.from({ length: 9 }, (_, i) => ({
      date: '2026-05-01',
      product: `Product ${i + 1}`,
      unitsSold: i * 10,
      revenue: i * 20
    }));
    const result = service.toChartData(manyPoints);
    // 9th product wraps around to first palette color
    expect(result.datasets[8].borderColor).toBe(result.datasets[0].borderColor);
  });

  it('should handle a single data point correctly', () => {
    const single: ProductSalesPoint[] = [
      { date: '2026-05-06', product: 'Diesel', unitsSold: 10, revenue: 20 },
    ];
    const result = service.toChartData(single);
    expect(result.labels).toEqual(['2026-05-06']);
    expect(result.datasets[0].data).toEqual([10]);
  });
});