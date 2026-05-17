import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { Product, Category } from '../../../services/products/product.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CatalogService } from '../../../services/catalog/catalog.service';
import { CartService } from '../../../services/cart/cart.service';
import { Card } from '../../../components/card/card';

type SortField = 'name' | 'currentStock' | 'salePrice';
type SortOrder = 'asc' | 'desc';

const FUEL_CATEGORIES = ['combustible', 'fuel', 'gasolina'];

function isFuelCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return FUEL_CATEGORIES.some((key) => lower.includes(key));
}

@Component({
  selector: 'app-catalog',
  imports: [
    CommonModule,
    FormsModule,
    Card,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    InputNumberModule,
    DialogModule,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsCatalog implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  filteredProducts: Product[] = [];
  gasolineProducts: Product[] = [];
  litersMap: Record<number, number> = {};
  selectedProduct: Product | null = null;
  detailVisible = false;
  selectedCategoryId: number | null = null;
  searchTerm = '';
  loading = true;
  error = '';
  isClient = false;
  isEmployee = false;

  private readonly authService = inject(AuthService);
  protected readonly cartService = inject(CartService);
  private readonly productCatalogService = inject(CatalogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Sorting state

  sortField: SortField = 'name';
  sortOrder: SortOrder = 'asc';

  sortFieldOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Stock', value: 'currentStock' },
    { label: 'Price', value: 'salePrice' },
  ];

  ngOnInit(): void {
    const role = this.authService.currentRole();
    this.isClient = role === 'CLIENT';
    this.isEmployee = role === 'EMPLOYEE' || role === 'ADMIN' || role === 'MANAGER';

    this.productCatalogService.getAvailableProducts().subscribe({
      next: (dtos) => {
        const allMapped: Product[] = dtos.map((dto) => ({
          id: dto.id,
          currentStock: dto.currentStock,
          name: dto.name,
          categoryId: dto.categoryId,
          description: dto.description ?? '',
          salePrice: dto.salePrice ?? 0,
          isGasoline: isFuelCategory(dto.categoryName),
          active: true,
        }));

        if (this.isEmployee) {
          this.gasolineProducts = [];
          this.products = allMapped;
        } else {
          // Client or anonymous: never show gasoline in main catalog
          this.gasolineProducts = this.isClient ? allMapped.filter((p) => p.isGasoline) : [];
          this.products = allMapped.filter((p) => !p.isGasoline);
          this.gasolineProducts.forEach((product) => {
            this.litersMap[product.id] = 1;
          });
        }

        // Extract unique categories from the product list

        const seen = new Set<number>();
        this.categories = dtos
          .filter((dto) => this.isEmployee || !isFuelCategory(dto.categoryName))
          .filter((dto) => {
            const isNew = !seen.has(dto.categoryId);
            seen.add(dto.categoryId);
            return isNew;
          })
          .map((dto) => ({ id: dto.categoryId, name: dto.categoryName }));

        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los productos.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filtering actions ─────────────────────────────────────────────────────────

  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.applyFilters();
  }

  // Triggered by search button or Enter key in search input

  search(): void {
    this.applyFilters();
  }

  openDetail(product: Product): void {
    if (!this.isClient) {
      return;
    }

    this.selectedProduct = product;
    this.detailVisible = true;
  }

  getCategoryName(categoryId: number): string {
    return this.categories.find((category) => category.id === categoryId)?.name ?? '';
  }

  addToCart(product: Product, quantity = 1): void {
    if (!this.isClient || product.currentStock === 0) {
      return;
    }

    this.cartService.addItem({
      productId: product.id,
      name: product.name,
      price: product.salePrice ?? 0,
      quantity: product.isGasoline ? (this.litersMap[product.id] ?? 1) : quantity,
      stock: product.currentStock,
    });
  }

  // ── Sorting actions ─────────────────────────────────────────────────────────

  setSortField(field: string): void {
    const sortField = field as SortField;
    if (this.sortField === sortField) {
      this.toggleSortOrder();
    } else {
      this.sortField = sortField;
      this.sortOrder = 'asc';
    }
    this.applyFilters();
  }

  // Toggle between ascending and descending order

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  // ── Utility methods ─────────────────────────────────────────────────────────

  private applyFilters(): void {
    let result = [...this.products];

    if (this.selectedCategoryId !== null) {
      result = result.filter((p) => p.categoryId === this.selectedCategoryId);
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((p) => {
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesCode = this.isEmployee && p.id.toString() === term.replace('#', '');
        return matchesName || matchesCode;
      });
    }

    result = this.sortProducts(result);

    this.filteredProducts = result;
  }

  // Sorts the given list of products based on the current sort field and order

  private sortProducts(list: Product[]): Product[] {
    return [...list].sort((a, b) => {
      const valA = a[this.sortField] ?? '';
      const valB = b[this.sortField] ?? '';

      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        comparison = (valA as number) - (valB as number);
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}
