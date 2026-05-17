import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryRevenueService } from './category-revenue';

const mockCategories = [
  { id: 1, name: 'Combustible' },
  { id: 2, name: 'Cafetería' },
  { id: 3, name: 'Accesorios' },
];

const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

const mockOrders = [
  {
    status: 'PICKED_UP',
    details: [
      { categoryId: 1, salePrice: 80, quantity: 1 },
      { categoryId: 2, salePrice: 1.50, quantity: 2 },
    ],
  },
  {
    status: 'PICKED_UP',
    details: [
      { categoryId: 3, salePrice: 9.75, quantity: 1 },
    ],
  },
  {
    status: 'CANCELLED',
    details: [
      { categoryId: 1, salePrice: 30, quantity: 1 },
    ],
  },
];

describe('CategoryRevenueService', () => {
  let service: CategoryRevenueService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CategoryRevenueService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CategoryRevenueService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getRevenueByCategory should return revenue per category', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      expect(result.length).toBe(3);

      const combustible = result.find((r) => r.categoryName === 'Combustible')!;
      expect(combustible.totalRevenue).toBe(80);

      const cafeteria = result.find((r) => r.categoryName === 'Cafetería')!;
      expect(cafeteria.totalRevenue).toBe(3);

      const accesorios = result.find((r) => r.categoryName === 'Accesorios')!;
      expect(accesorios.totalRevenue).toBe(9.75);

      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush(mockCategories);
    httpMock.expectOne('http://localhost:8080/orders').flush(mockOrders);
  });

  it('getRevenueByCategory should exclude CANCELLED orders', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      const combustible = result.find((r) => r.categoryName === 'Combustible')!;
      // Only 80 from PICKED_UP, not 30 from CANCELLED
      expect(combustible.totalRevenue).toBe(80);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush(mockCategories);
    httpMock.expectOne('http://localhost:8080/orders').flush(mockOrders);
  });

  it('getRevenueByCategory should return zeros when no orders', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      expect(result.every((r) => r.totalRevenue === 0)).toBe(true);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush(mockCategories);
    httpMock.expectOne('http://localhost:8080/orders').flush([]);
  });

  it('getRevenueByCategory should return empty array when no categories', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      expect(result).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush([]);
    httpMock.expectOne('http://localhost:8080/orders').flush(mockOrders);
  });

  it('getRevenueByCategory should handle categories HTTP error gracefully', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      expect(result).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories')
      .flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne('http://localhost:8080/orders').flush(mockOrders);
  });

  it('getRevenueByCategory should handle orders HTTP error gracefully', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      expect(result.every((r) => r.totalRevenue === 0)).toBe(true);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush(mockCategories);
    httpMock.expectOne('http://localhost:8080/orders')
      .flush(null, { status: 500, statusText: 'Error' });
  });

  it('getRevenueByCategory should count orderCount correctly', (done) => {
    service.getRevenueByCategory().subscribe((result) => {
      const combustible = result.find((r) => r.categoryName === 'Combustible')!;
      expect(combustible.orderCount).toBe(1);

      const cafeteria = result.find((r) => r.categoryName === 'Cafetería')!;
      expect(cafeteria.orderCount).toBe(1);
      done();
    });

    httpMock.expectOne('http://localhost:8080/categories').flush(mockCategories);
    httpMock.expectOne('http://localhost:8080/orders').flush(mockOrders);
  });
});