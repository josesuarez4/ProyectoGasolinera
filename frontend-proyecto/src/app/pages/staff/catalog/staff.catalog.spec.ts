import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { delay, of, throwError } from 'rxjs';
import { StaffCatalogPage } from './staff-catalog';
import { CategoryRevenueDTO, CategoryRevenueService } from '../../../services/category-revenue/category-revenue';
import { ProductService } from '../../../services/products/product.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ProductEvolutionService } from '../../../services/product-evolution/product-evolution.service';
import { ConfirmationService, MessageService } from 'primeng/api';

const mockRevenue: CategoryRevenueDTO[] = [
  { categoryId: 1, categoryName: 'Combustible', totalRevenue: 80, orderCount: 1 },
  { categoryId: 2, categoryName: 'Cafetería', totalRevenue: 3, orderCount: 1 },
];

function makeCategoryRevenueServiceMock(data = mockRevenue): Partial<CategoryRevenueService> {
  return {
    getRevenueByCategory: jest.fn().mockReturnValue(of(data)),
  };
}

describe('StaffCatalogPage', () => {
  let component: StaffCatalogPage;
  let fixture: ComponentFixture<StaffCatalogPage>;
  let mockAuthService: any;
  let mockProductService: any;
  let mockEvolutionService: any;
  let mockOrdersService: any;
  let mockMetricsService: any;

  const initMocks = () => {
    mockAuthService = {
      currentRole: jest.fn().mockReturnValue('ADMIN'),
      currentUser: jest.fn().mockReturnValue({ id: 1 })
    };
    mockProductService = {
      getAllProductsAdmin: jest.fn().mockReturnValue(of([])),
      getAllCategories: jest.fn().mockReturnValue(of([])),
      setProductActive: jest.fn().mockReturnValue(of({})),
      updateProduct: jest.fn().mockReturnValue(of({}))
    };
    mockOrdersService = {
      getSupplierOrders: jest.fn().mockReturnValue(of([]))
    };
    mockMetricsService = {
      getTopProducts: jest.fn().mockReturnValue(of([]))
    };
    mockEvolutionService = {
      estimateProductSales: jest.fn().mockReturnValue(of({
        estimatedNextMonth: 150,
        trend: 'rising',
        growthRate: 15,
        confidence: 'high',
        historicalData: []
      }).pipe(delay(100)))
    };
  };

  const buildModule = async (mock = makeCategoryRevenueServiceMock()) => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [StaffCatalogPage],
      providers: [
        { provide: CategoryRevenueService, useValue: mock },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProductService, useValue: mockProductService },
        { provide: ProductEvolutionService, useValue: mockEvolutionService },
        ConfirmationService,
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffCatalogPage);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    initMocks();
    await buildModule();
  });


  it('should create', async () => {
    await buildModule();
    expect(component).toBeTruthy();
  });

  it('should call getRevenueByCategory on init', async () => {
    const mock = makeCategoryRevenueServiceMock();
    await buildModule(mock);
    expect(mock.getRevenueByCategory).toHaveBeenCalledTimes(1);
  });

  it('should set loadingRevenue to false after load', async () => {
    await buildModule();
    expect(component['loadingRevenue']()).toBe(false);
  });

  it('should set categoryChartData with labels and datasets', async () => {
    await buildModule();
    const chartData = component['categoryChartData']();
    expect(chartData).not.toBeNull();
    expect(chartData.labels).toEqual(['Combustible', 'Cafetería']);
    expect(chartData.datasets[0].data).toEqual([80, 3]);
  });

  it('should handle empty revenue data', async () => {
    await buildModule(makeCategoryRevenueServiceMock([]));
    const chartData = component['categoryChartData']();
    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets[0].data).toEqual([]);
  });

  it('should set correct number of colors for datasets', async () => {
    await buildModule();
    const chartData = component['categoryChartData']();
    expect(chartData.datasets[0].backgroundColor.length).toBe(mockRevenue.length);
  });

  it('should check if filters are active (L70)', () => {
    expect(component['hasActiveFilters']()).toBe(false);
    component['onControlChange']({ searchTerm: 'Coffee', sortBy: 'name', sortOrder: 'asc' });
    expect(component['hasActiveFilters']()).toBe(true);
  });

  it('should format status values correctly in the table (L93-100)', () => {
    const activeCol = component['productColumns'].find(c => c.field === 'active');
    const formatter = activeCol?.formatter;
    if (formatter) {
      expect(formatter(true, {})).toBe('Active');
      expect(formatter(false, {})).toBe('Inactive');
      expect(formatter(null, {})).toBe('—');
    }
  });

  it('should return empty actions if user is not ADMIN or MANAGER (L117-119)', () => {
    mockAuthService.currentRole.mockReturnValue('EMPLOYEE');
    fixture.detectChanges();
    expect(component['productActions']()).toEqual([]);
  });

  it('should handle category and status filter changes (L138-156)', () => {
    component['onCategoryFilterChange']('5');
    expect(component['selectedCategoryId']()).toBe(5);
    component['onCategoryFilterChange']('  ');
    expect(component['selectedCategoryId']()).toBeNull();

    component['onStatusFilterChange']('ACTIVE');
    expect(component['productStatusFilter']()).toBe('active');
    component['onStatusFilterChange']('OTHER');
    expect(component['productStatusFilter']()).toBe('all');
  });

  it('should handle errors when loading products ', () => {
    mockProductService.getAllProductsAdmin.mockReturnValue(throwError(() => new Error('API Error')));
    component['loadProducts']();
    expect(component['errorMessage']()).toBe('API Error');
    expect(component['loadingProducts']()).toBe(false);
  });

  // it('should toggle product active status ', fakeAsync(() => {
  //   const mockProduct = { id: 1, name: 'Test', active: true };
  //   mockProductService.setProductActive.mockReturnValue(of({ ...mockProduct, active: false }));
  //   window.confirm = jest.fn().mockReturnValue(true);

  //   component['toggleProductActive'](mockProduct as any, false);
  //   expect(component['togglingId']()).toBe(1);
  //   tick();

  //   expect(mockProductService.setProductActive).toHaveBeenCalledWith(1, false);
  //   expect(component['statusMessage']()).not.toBeNull();
  //   expect(component['togglingId']()).toBeNull();
  // }));

  it('should handle various error types during product save ', fakeAsync(() => {
    component['productToEdit'].set({ id: 1 } as any);

    const validationError = {
      status: 400,
      error: { errors: { name: 'Too short' } }
    };
    mockProductService.updateProduct.mockReturnValue(throwError(() => validationError));
    (component as any).onSaveProduct({ name: 'A' });
    tick();
    expect(component['errorMessage']()).toContain('name: Too short');

    const generalError = { error: { message: 'Custom server error' } };
    mockProductService.updateProduct.mockReturnValue(throwError(() => generalError));
    (component as any).onSaveProduct({});
    tick();
    expect(component['errorMessage']()).toBe('Custom server error');

    mockProductService.updateProduct.mockReturnValue(throwError(() => ({})));
    (component as any).onSaveProduct({});
    tick();
    expect(component['errorMessage']()).toContain('Check that all fields are correctly filled');
  }));

  it('should call estimation service when action triggered', fakeAsync(() => {
    const mockProduct = { name: 'Fuel' };
    component['handleProductAction']({ action: { id: 'estimate' }, row: mockProduct as any });
    
    expect(component['showEstimationDialog']()).toBe(true);
    expect(component['loadingEstimation']()).toBe(true);
    
    tick(100);
    
    expect(mockEvolutionService.estimateProductSales).toHaveBeenCalledWith('Fuel');
    expect(component['estimationData']()).not.toBeNull();
    expect(component['loadingEstimation']()).toBe(false);
  }));
});
