import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductsCatalog } from './catalog';
import { CatalogService, ProductResponseDTO } from '../../../services/catalog/catalog.service';

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockDTOs: ProductResponseDTO[] = [
  { id: 1, categoryId: 1, categoryName: 'Supplements', currentStock: 15, name: 'Whey Protein 1kg',     description: 'Vanilla flavour',          salePrice: 25.00 },
  { id: 2, categoryId: 1, categoryName: 'Supplements', currentStock: 0,  name: 'Creatine Monohydrate', description: '100% Pure microfiltered',   salePrice: 18.50 },
  { id: 3, categoryId: 2, categoryName: 'Sports',      currentStock: 5,  name: 'Speed Jump Rope',      description: 'Adjustable steel cable',    salePrice: 10.00 },
  { id: 4, categoryId: 3, categoryName: 'Clothes',     currentStock: 12, name: 'Dry-Fit T-Shirt',      description: 'Black breathable material', salePrice: 15.00 },
];

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('ProductsCatalog', () => {
  let component: ProductsCatalog;
  let fixture: ComponentFixture<ProductsCatalog>;
  let catalogServiceMock: jest.Mocked<CatalogService>;

  beforeEach(async () => {
    catalogServiceMock = {
      getAvailableProducts: jest.fn().mockReturnValue(of(mockDTOs)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProductsCatalog],
      providers: [
        { provide: CatalogService, useValue: catalogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsCatalog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load products from API', () => {
    expect(component).toBeTruthy();
    expect(component.products.length).toBeGreaterThan(0);
    expect(component.categories.length).toBeGreaterThan(0);
    expect(component.filteredProducts.length).toEqual(component.products.length);
  });

  describe('Category filtering', () => {
    it('should filter by specific category id', () => {
      component.selectCategory(1);
      expect(component.selectedCategoryId).toBe(1);
      expect(component.filteredProducts.every(p => p.categoryId === 1)).toBe(true);
    });

    it('should show all products when selecting "All" (null)', () => {
      component.selectCategory(1);
      component.selectCategory(null);
      expect(component.selectedCategoryId).toBeNull();
      expect(component.filteredProducts.length).toBe(component.products.length);
    });
  });

  describe('Search functionality', () => {
    it('should filter products using the search term', () => {
      component.searchTerm = 'protein';
      component.search();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].id).toBe(1);
    });

    it('should ignore case sensitivity when searching', () => {
      component.searchTerm = 'CREATINE';
      component.search();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].id).toBe(2);
    });

    it('should show all products if search term is empty', () => {
      component.searchTerm = 'Protein';
      component.search();
      expect(component.filteredProducts.length).toBe(1);

      component.searchTerm = '   ';
      component.search();

      expect(component.filteredProducts.length).toBe(component.products.length);
    });

    it('should combine category filter and name search', () => {
      component.selectCategory(1);
      component.searchTerm = 'Creatine';
      component.search();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Creatine Monohydrate');
    });

    it('should return no results if no combined matches are found', () => {
      component.selectCategory(1);
      component.searchTerm = 'Comba';
      component.search();

      expect(component.filteredProducts.length).toBe(0);
    });
  });

  describe('Sorting Logic', () => {
    beforeEach(() => {
      component.products = [
        { id: 1, name: 'B Product', currentStock: 10, categoryId: 1, description: 'Desc B', salePrice: 20 },
        { id: 2, name: 'A Product', currentStock: 5,  categoryId: 1, description: 'Desc A', salePrice: 30 },
        { id: 3, name: 'C Product', currentStock: 15, categoryId: 1, description: 'Desc C', salePrice: 10 },
      ];
      component.search();
    });

    it('should sort by name in ascending order by default', () => {
      expect(component.filteredProducts[0].name).toBe('A Product');
      expect(component.filteredProducts[1].name).toBe('B Product');
      expect(component.filteredProducts[2].name).toBe('C Product');
    });

    it('should sort by name in descending order when toggled', () => {
      component.setSortField('name');
      expect(component.sortOrder).toBe('desc');
      expect(component.filteredProducts[0].name).toBe('C Product');
      expect(component.filteredProducts[1].name).toBe('B Product');
      expect(component.filteredProducts[2].name).toBe('A Product');
    });

    it('should sort by price (salePrice) in ascending order', () => {
      component.setSortField('salePrice');
      expect(component.sortField).toBe('salePrice');
      expect(component.sortOrder).toBe('asc');
      expect(component.filteredProducts[0].salePrice).toBe(10);
      expect(component.filteredProducts[1].salePrice).toBe(20);
      expect(component.filteredProducts[2].salePrice).toBe(30);
    });

    it('should sort by price (salePrice) in descending order after toggling', () => {
      component.setSortField('salePrice');
      component.setSortField('salePrice');
      expect(component.sortOrder).toBe('desc');
      expect(component.filteredProducts[0].salePrice).toBe(30);
      expect(component.filteredProducts[1].salePrice).toBe(20);
      expect(component.filteredProducts[2].salePrice).toBe(10);
    });

    it('should sort by stock (currentStock) in ascending order', () => {
      component.setSortField('currentStock');
      expect(component.sortField).toBe('currentStock');
      expect(component.sortOrder).toBe('asc');
      expect(component.filteredProducts[0].currentStock).toBe(5);
      expect(component.filteredProducts[1].currentStock).toBe(10);
      expect(component.filteredProducts[2].currentStock).toBe(15);
    });

    it('should toggle sort order when clicking the same field repeatedly', () => {
      component.setSortField('name');
      expect(component.sortOrder).toBe('desc');

      component.setSortField('name');
      expect(component.sortOrder).toBe('asc');
      expect(component.filteredProducts[0].name).toBe('A Product');
    });
  });
});
